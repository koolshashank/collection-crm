import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { rawGet, rawPost } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

/**
 * Mirror of includes/whatsapp_dootiq.php → dootiq_get_analytics_overview(),
 * feeding the dashboard "WhatsApp Analytics — Project Overview" card.
 *
 * Env vars (defaults = current PHP constants):
 *   DOOTIQ_BASE_URL       — Dootiq API base (default https://api.dootiq.com/api/v2)
 *   DOOTIQ_CLIENT_ID      — OAuth2 client id
 *   DOOTIQ_CLIENT_SECRET  — OAuth2 client secret (⚠ rotate on Dootiq dashboard)
 *
 * Token cache: module-level in-memory + /tmp JSON file fallback,
 * same shape as storage/dootiq_token_cache.json: { token, expires_at_ts }.
 */
const DOOTIQ_BASE_URL = process.env.DOOTIQ_BASE_URL || "https://api.dootiq.com/api/v2";
const DOOTIQ_CLIENT_ID = process.env.DOOTIQ_CLIENT_ID || "6a634fa4e7152e84a2c9084c";
const DOOTIQ_CLIENT_SECRET =
  process.env.DOOTIQ_CLIENT_SECRET ||
  "tk_live_fdf87e95fead74d7691d609dfe2c5f49f98c2c6bd9b39fb6d0aba430320996cc";
const TOKEN_CACHE_FILE = path.join("/tmp", "dootiq_token_cache.json");

let memoryCache = null; // { token, expires_at_ts }

function readCache() {
  if (memoryCache) return memoryCache;
  try {
    const raw = fs.readFileSync(TOKEN_CACHE_FILE, "utf8");
    const cached = JSON.parse(raw);
    if (cached && cached.token && cached.expires_at_ts) {
      memoryCache = cached;
      return cached;
    }
  } catch {
    /* no cache yet */
  }
  return null;
}

function writeCache(cache) {
  memoryCache = cache;
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache));
  } catch {
    /* /tmp not writable — in-memory cache still works */
  }
}

async function dootiqGetAccessToken(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCache();
    // 60s safety buffer, same as PHP
    if (cached && Date.now() / 1000 < cached.expires_at_ts - 60) return cached.token;
  }

  const res = await rawPost(
    `${DOOTIQ_BASE_URL}/oauth/token`,
    {
      grant_type: "client_credentials",
      client_id: DOOTIQ_CLIENT_ID,
      client_secret: DOOTIQ_CLIENT_SECRET,
    },
    { timeoutMs: 12000 }
  );

  const data = res.data;
  if (!data || typeof data !== "object" || !data.access_token) return null;

  const expiresIn = Number(data.expires_in ?? 3600);
  writeCache({ token: data.access_token, expires_at_ts: Math.floor(Date.now() / 1000) + expiresIn });
  return data.access_token;
}

async function fetchOverview(token) {
  return rawGet(`${DOOTIQ_BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 12000,
  });
}

export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }

    const accessToken = await dootiqGetAccessToken();
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        data: [],
        message: "Could not obtain a valid Dootiq access token.",
      });
    }

    let res = await fetchOverview(accessToken);

    if (res.status === 0) {
      return NextResponse.json({ success: false, data: [], message: "Network error: " + (res.error || "") });
    }

    /* Token expired mid-flight — refresh once and retry, same as PHP */
    if (res.status === 401) {
      const fresh = await dootiqGetAccessToken(true);
      if (fresh) res = await fetchOverview(fresh);
    }

    if (res.status !== 200 || !res.data || typeof res.data !== "object") {
      return NextResponse.json({ success: false, data: [], message: "Could not load analytics from Dootiq." });
    }

    return NextResponse.json({ success: true, data: res.data, message: "OK" });
  } catch {
    return NextResponse.json({ success: false, data: [], message: "Server error" }, { status: 500 });
  }
}
