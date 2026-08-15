import fs from "fs";
import path from "path";

/**
 * Zoho Mail token helper — port of zoho-token.php + zoho_tokens.json.
 *
 * NOTE: zoho-token.php itself was not present in the PHP source dump; its
 * behaviour is reconstructed from how get-mails.php / get_mail_body.php /
 * get-account.php use it:
 *   - tokens live in a JSON file `zoho_tokens.json` (web root in PHP),
 *     shape: { access_token, refresh_token?, expires_at?, client_id?, client_secret? }
 *   - zoho_is_connected(): tokens file exists with a usable token
 *   - zoho_get_access_token(): returns access_token, refreshing via the Zoho
 *     accounts server (accounts.zoho.in) when expired and a refresh_token +
 *     client credentials are available.
 *
 * Env vars (defaults documented):
 *   ZOHO_TOKENS_FILE   — path to zoho_tokens.json (default: <cwd>/zoho_tokens.json)
 *   ZOHO_CLIENT_ID     — OAuth client id   (fallback: client_id in tokens file)
 *   ZOHO_CLIENT_SECRET — OAuth client secret (fallback: client_secret in tokens file)
 *
 * The Zoho account id was cached in $_SESSION['zoho_account_id'] in PHP;
 * here we use a module-level in-memory cache + /tmp JSON file fallback
 * (per project conventions for token/id caches).
 */

const TOKENS_FILE =
  process.env.ZOHO_TOKENS_FILE || path.join(process.cwd(), "zoho_tokens.json");
const ACCOUNT_CACHE_FILE = "/tmp/zoho_account_id.json";

let memAccountId = null;

export function readZohoTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function zohoIsConnected() {
  const t = readZohoTokens();
  return Boolean(t && (t.access_token || t.refresh_token));
}

export async function zohoGetAccessToken() {
  const t = readZohoTokens();
  if (!t) return null;

  const expiresAt = t.expires_at ?? null;
  const stillValid =
    t.access_token && (!expiresAt || Date.now() / 1000 < Number(expiresAt));
  if (stillValid) return t.access_token;

  /* Refresh flow */
  if (!t.refresh_token) return t.access_token || null;
  const clientId = process.env.ZOHO_CLIENT_ID || t.client_id || "";
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || t.client_secret || "";
  if (!clientId || !clientSecret) return t.access_token || null;

  try {
    const qs = new URLSearchParams({
      refresh_token: t.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }).toString();
    const res = await fetch("https://accounts.zoho.in/oauth/v2/token?" + qs, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();
    if (data?.access_token) {
      const updated = {
        ...t,
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + (Number(data.expires_in) || 3600),
      };
      try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(updated));
      } catch {
        /* read-only fs — keep in-memory value only */
      }
      return data.access_token;
    }
  } catch {
    /* fall through */
  }
  return t.access_token || null;
}

export function getCachedAccountId() {
  if (memAccountId) return memAccountId;
  try {
    const cached = JSON.parse(fs.readFileSync(ACCOUNT_CACHE_FILE, "utf8"));
    memAccountId = cached?.account_id || null;
  } catch {
    /* no cache yet */
  }
  return memAccountId;
}

export function setCachedAccountId(id) {
  memAccountId = id;
  try {
    fs.writeFileSync(ACCOUNT_CACHE_FILE, JSON.stringify({ account_id: id }));
  } catch {
    /* in-memory only */
  }
}
