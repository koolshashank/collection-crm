/**
 * lib/callStatusAuth.js — OAuth2 client_credentials token for the
 * call-status backend webhook (CALL_STATUS_STORE_API_URL). Tokens expire
 * ~1hr after issue (expires_in from POST /api/webhook/oauth/token); this
 * caches the access token in memory and transparently refreshes it a bit
 * before expiry, so app/api/convox/call-status/route.js never has to think
 * about it.
 */

const TOKEN_URL = process.env.CALL_STATUS_OAUTH_TOKEN_URL || "https://dev.api.blinkrloan.com/api/webhook/oauth/token";
const CLIENT_ID = process.env.CALL_STATUS_CLIENT_ID || "";
const CLIENT_SECRET = process.env.CALL_STATUS_CLIENT_SECRET || "";

// Refresh this many seconds before actual expiry so a request never races
// against a token that expires mid-flight.
const REFRESH_MARGIN_SEC = 60;

let cached = null; // { accessToken, expiresAt }
let inFlight = null; // dedupes concurrent refreshes into a single request

async function fetchNewToken() {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth token request failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const data = await res.json();
  if (!data?.access_token) throw new Error("OAuth token response missing access_token");
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
}

/**
 * Returns a valid access token, fetching or refreshing one as needed.
 * Throws if the client isn't configured or the token request fails —
 * callers should catch and fall back (same contract as the rest of the
 * call-status storage path).
 */
export async function getCallStatusAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("CALL_STATUS_CLIENT_ID / CALL_STATUS_CLIENT_SECRET not configured");
  }
  if (cached && cached.expiresAt - REFRESH_MARGIN_SEC * 1000 > Date.now()) {
    return cached.accessToken;
  }
  if (!inFlight) {
    inFlight = fetchNewToken()
      .then((token) => {
        cached = token;
        return token.accessToken;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
