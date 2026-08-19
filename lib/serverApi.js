import { apiUrl } from "./apiConfig";
import { getSession } from "./session";

/**
 * Server-side fetch helpers with robust error handling.
 * Mirror of api_helper.php (api_get) but never throws raw —
 * always returns { ok, status, data, error }.
 */

async function doFetch(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text; // non-JSON payloads (HTML, files, etc.)
    }
    return { ok: res.ok, status: res.status, data, error: null };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted ? "Request timed out" : err?.message || "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token, extra = {}) {
  const headers = { Accept: "application/json", ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** GET a named endpoint. Token defaults to the logged-in session token. */
export async function apiGet(key, { token, suffix = "", params = {}, timeoutMs } = {}) {
  const jwt = token ?? getSession()?.jwt_token ?? "";
  return doFetch(apiUrl(key, suffix, params), { headers: authHeaders(jwt) }, timeoutMs);
}

/** POST JSON to a named endpoint. */
export async function apiPost(key, body, { token, suffix = "", params = {}, timeoutMs } = {}) {
  const jwt = token ?? getSession()?.jwt_token ?? "";
  return doFetch(
    apiUrl(key, suffix, params),
    {
      method: "POST",
      headers: authHeaders(jwt, { "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    },
    timeoutMs
  );
}

/** PUT JSON to a named endpoint. */
export async function apiPut(key, body, { token, suffix = "", params = {}, timeoutMs } = {}) {
  const jwt = token ?? getSession()?.jwt_token ?? "";
  return doFetch(
    apiUrl(key, suffix, params),
    {
      method: "PUT",
      headers: authHeaders(jwt, { "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    },
    timeoutMs
  );
}

/** Raw URL variants for third-party integrations (Convox, WhatsApp, gateways). */
export async function rawGet(url, { headers = {}, timeoutMs } = {}) {
  return doFetch(url, { headers }, timeoutMs);
}

export async function rawPost(url, body, { headers = {}, json = true, timeoutMs } = {}) {
  return doFetch(
    url,
    {
      method: "POST",
      headers: json ? { "Content-Type": "application/json", ...headers } : headers,
      body: json ? JSON.stringify(body ?? {}) : body,
    },
    timeoutMs
  );
}
