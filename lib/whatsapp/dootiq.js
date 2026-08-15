/**
 * lib/whatsapp/dootiq.js — Dootiq WhatsApp API integration.
 * Port of includes/whatsapp_dootiq.php (same URLs, payloads, texts).
 *
 * ENV VARS (defaults = current PHP values):
 *   DOOTIQ_BASE_URL      — API base (default https://api.dootiq.com/api/v2)
 *   DOOTIQ_CLIENT_ID     — OAuth2 client id
 *   DOOTIQ_CLIENT_SECRET — OAuth2 client secret (⚠️ rotate on Dootiq dashboard — PHP noted it as compromised)
 *
 * Token cache: module-level in-memory + /tmp JSON fallback — same shape
 * as PHP storage/dootiq_token_cache.json: { token, expires_at_ts }.
 */

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

export const DOOTIQ_BASE_URL =
  process.env.DOOTIQ_BASE_URL || "https://api.dootiq.com/api/v2";
const DOOTIQ_CLIENT_ID =
  process.env.DOOTIQ_CLIENT_ID || "6a634fa4e7152e84a2c9084c";
const DOOTIQ_CLIENT_SECRET =
  process.env.DOOTIQ_CLIENT_SECRET ||
  "tk_live_fdf87e95fead74d7691d609dfe2c5f49f98c2c6bd9b39fb6d0aba430320996cc"; // ⚠️ rotate on Dootiq dashboard first!

const TOKEN_CACHE_FILE = path.join(os.tmpdir(), "dootiq_token_cache.json");

/** In-memory token cache — survives across requests within one server process. */
let memoryCache = null; // { token, expires_at_ts }

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function readFileCache() {
  try {
    const raw = fs.readFileSync(TOKEN_CACHE_FILE, "utf8");
    const cached = JSON.parse(raw);
    if (cached && cached.token && cached.expires_at_ts) return cached;
  } catch {
    /* missing/corrupt cache file — ignore, we'll fetch fresh */
  }
  return null;
}

function writeFileCache(entry) {
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(entry));
  } catch {
    /* /tmp not writable — in-memory cache still works */
  }
}

async function doFetch(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
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
 * Fetches a fresh OAuth2 access token via client_credentials grant,
 * caching it (memory + /tmp) until it's close to expiring.
 * Same as PHP dootiq_get_access_token(). Returns string|null.
 */
export async function dootiqGetAccessToken(forceRefresh = false) {
  if (!forceRefresh) {
    if (
      memoryCache &&
      memoryCache.token &&
      nowTs() < memoryCache.expires_at_ts - 60 // 60s safety buffer
    ) {
      return memoryCache.token;
    }
    const cached = readFileCache();
    if (cached && nowTs() < cached.expires_at_ts - 60) {
      memoryCache = cached;
      return cached.token;
    }
  }

  const { data, error, text } = await doFetch(DOOTIQ_BASE_URL + "/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: DOOTIQ_CLIENT_ID,
      client_secret: DOOTIQ_CLIENT_SECRET,
    }),
  });

  if (error) {
    console.error("[DOOTIQ-TOKEN] fetch error: " + error);
    return null;
  }
  if (!data || !data.access_token) {
    console.error("[DOOTIQ-TOKEN] Unexpected response: " + text);
    return null;
  }

  const expiresIn = parseInt(data.expires_in ?? 3600, 10) || 3600;
  const entry = { token: data.access_token, expires_at_ts: nowTs() + expiresIn };
  memoryCache = entry;
  writeFileCache(entry);
  return entry.token;
}

/**
 * Lists WhatsApp templates from Dootiq (approved by default), including
 * body text + variable definitions. Same as PHP dootiq_list_templates().
 * @returns {{success:boolean, templates:Array, message:string}}
 */
export async function dootiqListTemplates(status = "APPROVED", limit = 100) {
  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, templates: [], message: "Could not obtain a valid Dootiq access token." };
  }

  const qs = new URLSearchParams({ status, page: "1", limit: String(limit) }).toString();
  const url = DOOTIQ_BASE_URL + "/templates?" + qs;

  let { status: httpCode, data, error, text } = await doFetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (error) {
    console.error("[DOOTIQ-TEMPLATES] fetch error: " + error);
    return { success: false, templates: [], message: "Could not reach Dootiq — network error." };
  }

  if (httpCode === 401) {
    const freshToken = await dootiqGetAccessToken(true);
    if (freshToken) {
      const retry = await doFetch(url, { headers: { Authorization: "Bearer " + freshToken } });
      httpCode = retry.status;
      data = retry.data;
      text = retry.text;
    }
  }

  if (httpCode !== 200 || !data || !("templates" in data)) {
    console.error("[DOOTIQ-TEMPLATES] Unexpected response (HTTP " + httpCode + "): " + text);
    return { success: false, templates: [], message: "Could not load templates from Dootiq." };
  }

  return { success: true, templates: data.templates, message: "OK" };
}

/**
 * Best-effort guess of which lead/customer field a template variable
 * should auto-fill from. Same as PHP dootiq_guess_variable_source().
 */
export function dootiqGuessVariableSource(varName) {
  const v = String(varName || "").toLowerCase();
  if (v.includes("name")) return "full_name";
  if (v.includes("amount") || v.includes("amt")) return "repayment_amount";
  if (v.includes("date")) return "repayment_date";
  return "";
}

function cleanPhone(to) {
  let clean = String(to || "").replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) {
    clean = clean.length === 10 ? "+91" + clean : "+" + clean;
  }
  return clean;
}

function randomKeySuffix() {
  return crypto.randomBytes(8).toString("hex").slice(0, 12);
}

/**
 * Sends a free-form (non-template) session message — only works if the
 * customer messaged within the last 24 hours. Same as PHP
 * send_whatsapp_freeform_dootiq().
 * @returns {{success:boolean, code:?string, message:string, raw:any}}
 */
export async function sendWhatsappFreeformDootiq(to, content) {
  const cleanTo = cleanPhone(to);

  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, code: null, message: "Could not obtain a valid Dootiq access token.", raw: null };
  }

  const payload = { to: cleanTo, channel: "whatsapp", content };
  const idempotencyKey =
    "wa_freeform_" + cleanTo.replace(/\D/g, "") + "_" + randomKeySuffix();

  const doSend = (token) =>
    doFetch(
      DOOTIQ_BASE_URL + "/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      15000
    );

  let { status: httpCode, data, error, text } = await doSend(accessToken);

  if (error) {
    console.error("[DOOTIQ-FREEFORM] fetch error: " + error);
    return { success: false, code: null, message: "Could not reach Dootiq — network error.", raw: error };
  }

  /* Token expired mid-flight — refresh once and retry */
  if (httpCode === 401) {
    const freshToken = await dootiqGetAccessToken(true);
    if (freshToken) {
      const retry = await doSend(freshToken);
      httpCode = retry.status;
      data = retry.data;
      text = retry.text;
    }
  }

  if (httpCode === 201) {
    return { success: true, code: null, message: "Message sent successfully.", raw: data };
  }

  const errCode = data?.error?.code ?? null;
  const errMsg = data?.error?.message ?? null;

  const friendlyMessages = {
    OUTSIDE_SESSION_WINDOW:
      "This customer hasn't messaged you in the last 24 hours — please send an approved Template instead.",
    CONSENT_REQUIRED: "Customer consent is required before messaging them directly.",
    INSUFFICIENT_BALANCE: "WhatsApp messaging balance is too low — contact your admin to top up.",
    VALIDATION_FAILED: "Validation failed — check the phone number and message content.",
  };

  const message = errMsg || friendlyMessages[errCode] || "Dootiq error (HTTP " + httpCode + ")";

  if (errCode !== "OUTSIDE_SESSION_WINDOW") {
    console.error("[DOOTIQ-FREEFORM] Failed (HTTP " + httpCode + "): " + text);
  }

  return { success: false, code: errCode, message, raw: data };
}

/**
 * Fetches the full conversation (with message history) for a customer by
 * phone number. Same as PHP dootiq_get_conversation_by_phone().
 * @returns {{success:boolean, messages:Array, conversation:?object, message:string}}
 */
export async function dootiqGetConversationByPhone(phone, limit = 100) {
  const clean = cleanPhone(phone);

  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, messages: [], conversation: null, message: "Could not obtain a valid Dootiq access token." };
  }

  const qs = new URLSearchParams({ include: "messages", limit: String(limit) }).toString();
  const url = DOOTIQ_BASE_URL + "/conversations/by-phone/" + encodeURIComponent(clean) + "?" + qs;

  let { status: httpCode, data, error, text } = await doFetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (error) {
    console.error("[DOOTIQ-CONV] fetch error: " + error);
    return { success: false, messages: [], conversation: null, message: "Could not reach Dootiq — network error." };
  }

  if (httpCode === 401) {
    const freshToken = await dootiqGetAccessToken(true);
    if (freshToken) {
      const retry = await doFetch(url, { headers: { Authorization: "Bearer " + freshToken } });
      httpCode = retry.status;
      data = retry.data;
      text = retry.text;
    }
  }

  /* No conversation yet for this number — not an error, just empty history */
  if (httpCode === 404) {
    return { success: true, messages: [], conversation: null, message: "No conversation yet." };
  }

  if (httpCode !== 200 || !data || typeof data !== "object") {
    console.error("[DOOTIQ-CONV] Unexpected response (HTTP " + httpCode + "): " + text);
    return { success: false, messages: [], conversation: null, message: "Could not load conversation from Dootiq." };
  }

  return {
    success: true,
    messages: data.messages ?? [],
    conversation: data.active ?? null,
    message: "OK",
  };
}

/**
 * Registers a webhook subscription with Dootiq. Same as PHP
 * dootiq_register_webhook(). The returned 'secret' is shown ONLY ONCE.
 * @returns {{success:boolean, data:?object, message:string}}
 */
export async function dootiqRegisterWebhook(url, events) {
  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, data: null, message: "Could not obtain a valid Dootiq access token." };
  }

  const { status: httpCode, data, error } = await doFetch(DOOTIQ_BASE_URL + "/webhooks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken,
    },
    body: JSON.stringify({ url, events }),
  });

  if (error) {
    return { success: false, data: null, message: "Network error: " + error };
  }

  if (httpCode !== 201 || !data || typeof data !== "object") {
    const errMsg = data?.error?.message ?? "HTTP " + httpCode;
    return { success: false, data, message: errMsg };
  }

  return { success: true, data, message: "Webhook registered successfully." };
}

/**
 * Fetches project-wide analytics counters. Same as PHP
 * dootiq_get_analytics_overview().
 * @returns {{success:boolean, data:object|Array, message:string}}
 */
export async function dootiqGetAnalyticsOverview() {
  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, data: [], message: "Could not obtain a valid Dootiq access token." };
  }

  const url = DOOTIQ_BASE_URL + "/analytics/overview";
  let { status: httpCode, data, error, text } = await doFetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (error) {
    return { success: false, data: [], message: "Network error: " + error };
  }

  if (httpCode === 401) {
    const freshToken = await dootiqGetAccessToken(true);
    if (freshToken) {
      const retry = await doFetch(url, { headers: { Authorization: "Bearer " + freshToken } });
      httpCode = retry.status;
      data = retry.data;
      text = retry.text;
    }
  }

  if (httpCode !== 200 || !data || typeof data !== "object") {
    console.error("[DOOTIQ-ANALYTICS] Unexpected response (HTTP " + httpCode + "): " + text);
    return { success: false, data: [], message: "Could not load analytics from Dootiq." };
  }

  return { success: true, data, message: "OK" };
}

/**
 * Sends an approved WhatsApp template message via Dootiq. Same as PHP
 * send_whatsapp_template_dootiq().
 * @returns {{success:boolean, message:string, raw:any}}
 */
export async function sendWhatsappTemplateDootiq(
  to,
  templateName,
  variables,
  language = "en",
  headerMediaUrl = null
) {
  const cleanTo = cleanPhone(to);

  const accessToken = await dootiqGetAccessToken();
  if (!accessToken) {
    return { success: false, message: "Could not obtain a valid Dootiq access token.", raw: null };
  }

  const payload = {
    to: cleanTo,
    templateName,
    language,
    variables,
  };
  if (headerMediaUrl) payload.headerMediaUrl = headerMediaUrl;

  /* Unique idempotency key per logical send — prevents duplicate sends
     on network retry within a 24h window */
  const idempotencyKey =
    "wa_" + cleanTo.replace(/\D/g, "") + "_" + templateName + "_" + randomKeySuffix();

  const doSend = (token) =>
    doFetch(
      DOOTIQ_BASE_URL + "/messages/template",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      15000
    );

  let { status: httpCode, data, error, text } = await doSend(accessToken);

  if (error) {
    console.error("[DOOTIQ-SEND] fetch error: " + error);
    return { success: false, message: "Could not reach Dootiq — network error.", raw: error };
  }

  /* Token expired mid-flight — refresh once and retry automatically */
  if (httpCode === 401) {
    const freshToken = await dootiqGetAccessToken(true);
    if (freshToken) {
      const retry = await doSend(freshToken);
      if (retry.data && typeof retry.data === "object") {
        data = retry.data;
        httpCode = retry.status;
        text = retry.text;
      }
    }
  }

  if (httpCode === 201 && data?.messageId) {
    return { success: true, message: "Message sent successfully.", raw: data };
  }

  /* Map documented error codes to clearer messages */
  const errCode = data?.error?.code ?? null;
  const errMsg = data?.error?.message ?? null;

  const friendlyMessages = {
    VALIDATION_FAILED: "Validation failed — check the variables match the template exactly.",
    TEMPLATE_NOT_FOUND: "Template not found — check the exact template name configured in Dootiq.",
    TEMPLATE_NOT_APPROVED: "This template is not yet approved by Meta/WhatsApp.",
  };

  const message = errMsg || friendlyMessages[errCode] || "Dootiq error (HTTP " + httpCode + ")";

  console.error("[DOOTIQ-SEND] Failed (HTTP " + httpCode + "): " + text);

  return { success: false, message, raw: data };
}
