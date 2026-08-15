/**
 * lib/convox.js — ConVox (Deepija) telephony integration.
 * Port of includes/convox_click_to_call.php, convox_end_call.php,
 * convox_sso.php, convox_incoming_auth.php, convox_locations.php.
 *
 * ⚠️ Server-side only — contains SECRET/MASTER keys, never import from
 * client components.
 *
 * ENV VARS (defaults = current PHP values):
 *   CONVOX_C2C_MASTER_KEY   — static master key for secureToken (default PHP value)
 *   CONVOX_C2C_DIAL_PREFIX  — 3-digit dial prefix (default "011")
 *   CONVOX_USER_ID_MAP      — JSON map crm-email → ConVox User ID
 *   CONVOX_USER_LOCATION_MAP— JSON map crm-email → location number (1|2)
 *   CONVOX_DOMAIN           — SSO widget domain (default https://blinkrloan.deepijatel.in)
 *   CONVOX_WIDGET_PATH      — SSO widget path (default /ConVoxCCS/ExternalIndex)
 *   CONVOX_SSO_KEY / CONVOX_SSO_IV — widget SSO encryption key + IV
 *   CONVOX_INCOMING_SECRET  — secret WE issue to ConVox for Call PopUp / Call Status APIs
 *
 * Token cache: in-memory + /tmp JSON fallback, per-location — same shape
 * as PHP storage/convox_token_cache_<host>.json: { token, expires_at_ts }.
 */

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

/* ──────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────── */

// ⚠️ STATIC MASTER KEY — Deepija provided for production.
export const CONVOX_C2C_MASTER_KEY =
  process.env.CONVOX_C2C_MASTER_KEY || "PROD_MIAGCSqGSIb3DQEHAqCAMIACAQExC";

// ✅ CONFIRMED — must be exactly 3 digits.
export const CONVOX_C2C_DIAL_PREFIX = process.env.CONVOX_C2C_DIAL_PREFIX || "011";

// SSO widget (convox_sso.php)
export const CONVOX_DOMAIN =
  process.env.CONVOX_DOMAIN || "https://blinkrloan.deepijatel.in";
export const CONVOX_WIDGET_PATH =
  process.env.CONVOX_WIDGET_PATH || "/ConVoxCCS/ExternalIndex";
// ⚠️ REPLACE — get production values from Deepija (PHP defaults kept)
const CONVOX_SSO_KEY = process.env.CONVOX_SSO_KEY || "X9fT!2zQ@7rLw8pVb3Kd#6NhY0sGm5Ae";
const CONVOX_SSO_IV = process.env.CONVOX_SSO_IV || "MTIzNDU2Nzg5MDEyMzQ1Ng==";

// Secret WE define and give to Deepija for requests coming FROM ConVox
// (Call PopUp API / Call Status API). ⚠️ CHANGE before going live.
export const CONVOX_INCOMING_SECRET =
  process.env.CONVOX_INCOMING_SECRET || "CRM_REPLACE_WITH_YOUR_OWN_RANDOM_SECRET_TOKEN";

/* Deepija has TWO separate ConVox server instances — each agent lives on
   exactly one. Same data as includes/convox_locations.php. */
export const CONVOX_LOCATIONS = {
  1: {
    name: "Location 1 (Dev)",
    domain: "https://blinkrloandev.deepijatel.in",
    widget_path: "/ConVoxCCS/Agent/ExternalDialer",
    c2c_base: "https://blinkrloandev.deepijatel.in/ConVoxCCS/rest/api",
    token_url: "https://blinkrloandev.deepijatel.in/ConVoxCCS/rest/secureToken",
    web_server_ip: "192.168.0.155",
  },
  2: {
    name: "Location 2 (Production)",
    domain: "https://blinkrloan.deepijatel.in",
    widget_path: "/ConVoxCCS/Agent/ExternalDialer",
    c2c_base: "https://blinkrloan.deepijatel.in/ConVoxCCS/rest/api",
    token_url: "https://blinkrloan.deepijatel.in/ConVoxCCS/rest/secureToken",
    web_server_ip: "192.168.0.154",
  },
};

function parseJsonEnv(name, fallback) {
  try {
    const raw = process.env[name];
    if (raw) return JSON.parse(raw);
  } catch {
    /* bad JSON in env — use fallback */
  }
  return fallback;
}

/* EMAIL → CONVOX USER ID MAPPING — ConVox "User ID" cannot be derived
   from the CRM email, so it is mapped manually per agent. */
export const CONVOX_USER_ID_MAP = parseJsonEnv("CONVOX_USER_ID_MAP", {
  "lalit.kumar@blinkrloan.com": "LALIT",
  // "another.agent@blinkrloan.com": "THEIR_CONVOX_USERID",
});

/* CRM login email → which ConVox location (1 or 2). Default 2 (production). */
export const CONVOX_USER_LOCATION_MAP = parseJsonEnv("CONVOX_USER_LOCATION_MAP", {
  "lalit.kumar@blinkrloan.com": 2,
  // "newagent@blinkrloan.com": 1,
});

/** Resolves a CRM login email to the ConVox "User ID". null if unmapped. */
export function convoxResolveUserId(crmEmail) {
  return CONVOX_USER_ID_MAP[crmEmail] ?? null;
}

/** Resolves a CRM email to its full location config object. */
export function convoxGetLocationForEmail(email) {
  const locNum = CONVOX_USER_LOCATION_MAP[email] ?? 2;
  return CONVOX_LOCATIONS[locNum] ?? CONVOX_LOCATIONS[2];
}

/* ──────────────────────────────────────────────
   SECURE TOKEN — per-location cache (memory + /tmp)
────────────────────────────────────────────── */

const tokenMemoryCache = {}; // { [locKey]: { token, expires_at_ts } }

function locCacheKey(location) {
  let host = "default";
  try {
    host = new URL(location.domain).host || "default";
  } catch {
    /* keep default */
  }
  return host.replace(/[^A-Za-z0-9_]/g, "_");
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

async function doFetch(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: res.status, data, text, error: null };
  } catch (err) {
    return {
      status: 0,
      data: null,
      text: "",
      error: err?.name === "AbortError" ? "timeout" : err?.message || "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches a fresh Access-Token (REFRESH_TOKEN) from ConVox's secureToken
 * endpoint using the static master key, caching it keyed to ConVox's own
 * EXPIRES_AT. Same as PHP convox_get_secure_token().
 *
 * Confirmed response shape:
 * {"STATUS":"SUCCESS","MESSAGE":"...","REFRESH_TOKEN":"...","EXPIRES_AT":"2026-07-20 12:46:00"}
 */
export async function convoxGetSecureToken(location, forceRefresh = false) {
  const locKey = locCacheKey(location);
  const cacheFile = path.join(os.tmpdir(), "convox_token_cache_" + locKey + ".json");

  if (!forceRefresh) {
    const mem = tokenMemoryCache[locKey];
    if (mem && mem.token && nowTs() < mem.expires_at_ts - 60) {
      return mem.token; // 60s safety buffer before actual expiry
    }
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (cached && cached.token && cached.expires_at_ts && nowTs() < cached.expires_at_ts - 60) {
        tokenMemoryCache[locKey] = cached;
        return cached.token;
      }
    } catch {
      /* no valid file cache */
    }
  }

  const { data, error, text } = await doFetch(location.token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": CONVOX_C2C_MASTER_KEY,
    },
    body: "",
  });

  if (error) {
    console.error("[CONVOX-SECURETOKEN] fetch error (" + location.domain + "): " + error);
    return null;
  }
  if (!data || typeof data !== "object") {
    console.error("[CONVOX-SECURETOKEN] Unexpected response (" + location.domain + "): " + text);
    return null;
  }
  if ((data.STATUS ?? "") !== "SUCCESS") {
    console.error("[CONVOX-SECURETOKEN] Non-success status (" + location.domain + "): " + text);
    return null;
  }
  const token = data.REFRESH_TOKEN ?? null;
  if (!token) {
    console.error("[CONVOX-SECURETOKEN] REFRESH_TOKEN missing in response: " + text);
    return null;
  }

  let expiresAtTs = nowTs() + 55 * 60; // fallback if date format ever changes
  if (data.EXPIRES_AT) {
    const parsed = Date.parse(String(data.EXPIRES_AT).replace(" ", "T"));
    if (!Number.isNaN(parsed)) expiresAtTs = Math.floor(parsed / 1000);
  }

  const entry = { token, expires_at_ts: expiresAtTs };
  tokenMemoryCache[locKey] = entry;
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(entry));
  } catch {
    /* /tmp not writable — memory cache still works */
  }
  return token;
}

/* ──────────────────────────────────────────────
   ERROR CODE MAPS — from the API docs
────────────────────────────────────────────── */

export function convoxC2cErrorMessage(code) {
  const map = {
    GE001: "Invalid request — only POST method is allowed.",
    GE002: "Request body is missing.",
    GE003: "Access token missing on request.",
    GE004: "Reference ID (refno) is required.",
    GE005: "Reference ID must be alphanumeric/underscore only.",
    GE006: "Reference ID must be 6–20 characters long.",
    GE007: "Access token is invalid — check with Deepija.",
    GE008: "Access token expired — needs to be regenerated.",
    GE009: "Unsupported action sent to ConVox.",
    GE010: "Click-to-Call API is not enabled — contact ConVox support.",
    CL001: "Invalid phone number — must be 10 digits.",
    CL002: "Agent ID or phone number missing in request.",
    CL003: "Agent not available in ConVox.",
    CL004: "Agent is not idle right now — try again in a moment.",
    CL005: "Agent is busy (wrap-up/ringing state).",
    CL006: "Agent is not logged in to ConVox widget — please log in first.",
    CL007: "Calling is not permitted outside working hours.",
    CL008: "This number is on the Do-Not-Call (DNC) list.",
    CL009: "Call limit exceeded for this agent/account.",
    CL010: "No PRI channel available right now — try again shortly.",
    CL011: "Call validation failed on ConVox side.",
  };
  return map[code] ?? "Unknown ConVox error (" + code + ").";
}

export function convoxEcErrorMessage(code) {
  const map = {
    GE001: "Invalid request — only POST method is allowed.",
    GE002: "Invalid request — no parameters found.",
    GE003: "Access token missing or invalid.",
    GE004: "Reference ID (refno) is required.",
    GE005: "Invalid Reference ID format — only letters, numbers, underscores allowed.",
    GE006: "Reference ID must be between 6 and 20 characters.",
    GE007: "Invalid Access-Token.",
    GE008: "Access Token expired — needs to be regenerated.",
    GE009: "Invalid action.",
    GE010: "End-Call API is not enabled — contact ConVox support.",
    GE011: "Action should not be empty.",
    EC001:
      "Invalid disposition — this disposition code does not exist for your account. Check the exact codes configured in ConVox Admin Panel.",
    EC002: "Invalid break value — does not exist for your account.",
    EC003: "No agent available with this call reference ID.",
    EC004: "User ID should not be empty.",
    EC005: "Mobile number should be 10 digits only.",
    EC006: "Mobile number should not be empty.",
    EC007: "Mobile number should be numeric only.",
    EC008: "Invalid end_call_type — must be CLOSE, TRANSFER, EXTTRNSF, or MOBILE_TRANSFER.",
    EC009: "Please provide CallReferenceID.",
    EC010: "Process name does not exist, or no agent available with this call reference ID.",
    EC012: "Agent status might be MISSED/BREAK/IDLE.",
    EC013: "Something went wrong — please contact administrator.",
    EC014: "Callback date is required when follow-up is enabled.",
    EC015: "Callback hours is required when follow-up is enabled.",
    EC016: "Callback minutes is required when follow-up is enabled.",
    EC017: "Callback date must be in format YYYY-MM-DD.",
    EC018: "Callback hours must be between 00-23.",
    EC019: "Callback minutes must be between 00-59.",
    EC020: "Callback time must be in the future.",
    EC021: "User ID can only contain letters, numbers, and underscores.",
    EC022: "Invalid User ID.",
  };
  return map[code] ?? "Unknown ConVox error (" + code + ").";
}

/* ──────────────────────────────────────────────
   TRIGGER CALL — Click-to-Call
────────────────────────────────────────────── */

/**
 * Places an outbound call through ConVox on behalf of an agent.
 * Same as PHP convox_trigger_call().
 * @returns {{success:boolean, code:?string, message:string, raw:any}}
 */
export async function convoxTriggerCall(userid, phoneNumber, refno, location, dialPrefix = null) {
  // Basic validation before even hitting the API
  const phoneClean = String(phoneNumber || "").replace(/\D/g, "");
  if (phoneClean.length !== 10) {
    return { success: false, code: "CL001", message: convoxC2cErrorMessage("CL001"), raw: null };
  }
  let refnoClean = String(refno || "").replace(/[^A-Za-z0-9_]/g, "");
  if (refnoClean.length < 6 || refnoClean.length > 20) {
    // Pad/trim so a short lead_id like "42" doesn't hard-fail — safer to prefix
    refnoClean = ("REF_" + refnoClean).slice(0, 20);
    if (refnoClean.length < 6) {
      return { success: false, code: "GE006", message: convoxC2cErrorMessage("GE006"), raw: null };
    }
  }
  if (!userid) {
    return { success: false, code: "CL002", message: convoxC2cErrorMessage("CL002"), raw: null };
  }

  const payload = {
    action: "CALL",
    userid,
    phone_number: phoneClean,
    dial_prefix: dialPrefix ?? CONVOX_C2C_DIAL_PREFIX,
    refno: refnoClean,
  };

  const accessToken = await convoxGetSecureToken(location);
  if (!accessToken) {
    return {
      success: false,
      code: "GE007",
      message: "Could not obtain a valid Access-Token from ConVox (" + location.name + ").",
      raw: null,
    };
  }

  const post = (token) =>
    doFetch(location.c2c_base, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": token },
      body: JSON.stringify(payload),
    });

  let { status: httpCode, data, error, text } = await post(accessToken);

  if (error) {
    console.error("[CONVOX-C2C] fetch error (" + location.name + "): " + error);
    return { success: false, code: null, message: "Could not reach ConVox server — network error.", raw: error };
  }
  if (!data || typeof data !== "object") {
    console.error("[CONVOX-C2C] Unexpected response (" + location.name + "): " + text);
    return { success: false, code: null, message: "Unexpected response from ConVox.", raw: text };
  }

  let status = data.STATUS ?? data.status ?? null;

  // Token expired mid-flight — refresh once and retry automatically
  if (status === "GE008" || httpCode === 401) {
    const freshToken = await convoxGetSecureToken(location, true);
    if (freshToken) {
      const retry = await post(freshToken);
      if (retry.data && typeof retry.data === "object") {
        data = retry.data;
        status = retry.data.STATUS ?? retry.data.status ?? null;
      }
    }
  }

  if (status === "CL000") {
    return { success: true, code: "CL000", message: "Call placed successfully.", raw: data };
  }

  // Prefer ConVox's own MESSAGE text over our hardcoded map — the server's
  // message is the source of truth; the map is only a last-resort fallback.
  const fallbackMessage = data.MESSAGE ?? data.message ?? null;
  const message = fallbackMessage ? fallbackMessage : convoxC2cErrorMessage(String(status));

  if (!fallbackMessage) {
    console.error(
      '[CONVOX-C2C] No MESSAGE in response for status "' + status + '" — full response: ' + JSON.stringify(data)
    );
  }

  return { success: false, code: status, message, raw: data };
}

/* ──────────────────────────────────────────────
   END CALL — close with disposition (+ optional follow-up)
────────────────────────────────────────────── */

/**
 * Closes/ends a call on ConVox with a disposition, optionally scheduling
 * a follow-up callback. Same as PHP convox_end_call().
 * @param {object} followUp { enabled, date:'YYYY-MM-DD', hrs:'14', mins:'30' }
 * @returns {{success:boolean, code:?string, message:string, raw:any}}
 */
export async function convoxEndCall(
  location,
  userid,
  mobile,
  refno,
  disposition,
  endCallType = "CLOSE",
  processName = "ConVoxProcess",
  followUp = {},
  convoxId = null,
  callReferenceId = null
) {
  const phoneClean = String(mobile || "").replace(/\D/g, "");
  if (phoneClean.length !== 10) {
    return { success: false, code: "EC005", message: convoxEcErrorMessage("EC005"), raw: null };
  }
  if (!userid) {
    return { success: false, code: "EC004", message: convoxEcErrorMessage("EC004"), raw: null };
  }
  const validEndTypes = ["CLOSE", "TRANSFER", "EXTTRNSF", "MOBILE_TRANSFER"];
  if (!validEndTypes.includes(endCallType)) {
    return { success: false, code: "EC008", message: convoxEcErrorMessage("EC008"), raw: null };
  }

  const payload = {
    action: "ENDCALL",
    endcall_type: endCallType,
    convoxid: convoxId ?? refno, // ⚠️ confirm real source with Deepija
    disposition,
    userid,
    process_name: processName,
    mobile_number: phoneClean,
    refno,
    callreferenceid: callReferenceId ?? refno, // ⚠️ same caveat as convoxid
  };

  const followUpEnabled = Boolean(followUp?.enabled);
  payload.set_followUp = followUpEnabled ? "Y" : "N";
  if (followUpEnabled) {
    payload.callback_date = followUp?.date ?? "";
    payload.callback_hrs = followUp?.hrs ?? "";
    payload.callback_mins = followUp?.mins ?? "";
  }

  const accessToken = await convoxGetSecureToken(location);
  if (!accessToken) {
    return {
      success: false,
      code: "GE007",
      message: "Could not obtain a valid Access-Token from ConVox (" + location.name + ").",
      raw: null,
    };
  }

  const { data, error, text } = await doFetch(location.c2c_base, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Access-Token": accessToken },
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error("[CONVOX-ENDCALL] fetch error (" + location.name + "): " + error);
    return { success: false, code: null, message: "Could not reach ConVox server — network error.", raw: error };
  }
  if (!data || typeof data !== "object") {
    console.error("[CONVOX-ENDCALL] Unexpected response: " + text);
    return { success: false, code: null, message: "Unexpected response from ConVox.", raw: text };
  }

  const status = data.STATUS ?? null;

  if (status === "EC000") {
    return { success: true, code: "EC000", message: "Call closed successfully.", raw: data };
  }

  // Prefer ConVox's own MESSAGE — server's message is the source of truth.
  const fallbackMessage = data.MESSAGE ?? data.message ?? null;
  const message = fallbackMessage ? fallbackMessage : convoxEcErrorMessage(String(status));

  return { success: false, code: status, message, raw: data };
}

/* ──────────────────────────────────────────────
   SSO — widget URL encryption (convox_sso.php)
   AES-256-CBC, sha256(key) as 32-byte key, fixed IV,
   raw output → base64 → urlencode
────────────────────────────────────────────── */

/**
 * Encrypts the agent's email/username into a URL-safe string.
 * Same as PHP convox_encrypt_username(). Returns null on failure.
 */
export function convoxEncryptUsername(username) {
  if (!username) return null;
  try {
    let iv = Buffer.from(CONVOX_SSO_IV, "utf8");
    // If the IV isn't 16 bytes, some deployments give it base64-encoded — try decoding
    if (iv.length !== 16) {
      const decoded = Buffer.from(CONVOX_SSO_IV, "base64");
      if (decoded.length === 16) {
        iv = decoded;
      } else {
        console.error("[CONVOX-SSO] IV is not 16 bytes — check CONVOX_SSO_IV value with Deepija");
        return null;
      }
    }

    const key = crypto.createHash("sha256").update(CONVOX_SSO_KEY, "utf8").digest(); // 32-byte key
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const ciphertext = Buffer.concat([cipher.update(username, "utf8"), cipher.final()]);
    return encodeURIComponent(ciphertext.toString("base64"));
  } catch (err) {
    console.error("[CONVOX-SSO] encryption failed: " + (err?.message || err));
    return null;
  }
}

/**
 * Builds the full SSO widget URL for the logged-in agent.
 * Same as PHP convox_widget_url(). Returns null on failure.
 */
export function convoxWidgetUrl(crmUserEmail) {
  const enc = convoxEncryptUsername(crmUserEmail);
  if (enc === null) return null;
  return CONVOX_DOMAIN + CONVOX_WIDGET_PATH + "?ExternalUserName=" + enc;
}

/* ──────────────────────────────────────────────
   INCOMING AUTH — validates requests COMING FROM ConVox
   (Call PopUp API / Call Status API). We define the secret and give
   it to Deepija to paste into ConVox Admin Panel.
────────────────────────────────────────────── */

function timingSafeEquals(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Checks the incoming request for a valid secret, accepting either
 * "Access-Token: <token>" or "Authorization: Bearer <token>" header —
 * same as PHP convox_incoming_request_authorized().
 * @param {Headers} headers Request headers
 */
export function convoxIncomingRequestAuthorized(headers) {
  try {
    const accessTokenHeader = headers.get("access-token");
    const authHeader = headers.get("authorization");

    if (accessTokenHeader && timingSafeEquals(CONVOX_INCOMING_SECRET, accessTokenHeader.trim())) {
      return true;
    }
    if (authHeader) {
      const m = authHeader.trim().match(/^Bearer\s+(.+)$/i);
      if (m && timingSafeEquals(CONVOX_INCOMING_SECRET, m[1].trim())) {
        return true;
      }
    }
  } catch {
    /* fall through to false */
  }
  return false;
}
