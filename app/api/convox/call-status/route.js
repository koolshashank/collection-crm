/**
 * POST /api/convox/call-status — receiver for ConVox's "Call Status API".
 * (See vendor doc: Call Status API Documentation.pdf)
 *
 * ConVox calls THIS endpoint after every call finishes, POSTing the full
 * CDR (disposition, duration, recording link, queue/ring times, etc).
 * Auth: same secret-based scheme as the Call PopUp receiver
 * (/api/convox/incoming-auth) — either header works:
 *   Access-Token: <CONVOX_INCOMING_SECRET>
 *   Authorization: Bearer <CONVOX_INCOMING_SECRET>
 *
 * Response shapes are exactly as documented by Deepija:
 *   200 { "status": "success", "message": "Call status updated successfully" }
 *   400 { "status": "error",   "message": "Invalid parameters or missing fields" }
 *   401 { "status": "error",   "message": "Invalid or expired access token." }
 *   500 { "status": "error",   "message": "An unexpected error occurred." }
 *
 * STORAGE:
 * Forwards to Blinkr's own call-status webhook — POST /api/webhook/v1/call_status
 * — mapped to that endpoint's { call_id, status, mobile } shape. Configured via:
 *   CALL_STATUS_STORE_API_URL     — the webhook URL
 *   CALL_STATUS_CLIENT_ID         — OAuth client_credentials client_id
 *   CALL_STATUS_CLIENT_SECRET     — OAuth client_credentials client_secret
 * (CALL_STATUS_OAUTH_TOKEN_URL overrides the token endpoint if it ever moves.)
 * lib/callStatusAuth.js fetches + caches the bearer token and refreshes it
 * automatically before it expires (tokens are short-lived, ~1hr) — no manual
 * token rotation needed.
 *
 * UNTIL those are set (or if the call to it fails for any reason), this
 * falls back to local-file storage under data/call_status_logs/ so no
 * event is ever silently dropped.
 */

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { convoxIncomingRequestAuthorized } from "@/lib/convox";
import { getCallStatusAccessToken } from "@/lib/callStatusAuth";

export const dynamic = "force-dynamic";

// Fields ConVox documents as part of the payload. Only a handful are treated
// as hard-required below — the rest are stored/forwarded as-is, whatever
// ConVox sends.
const REQUIRED_FIELDS = ["CALL_REFERENCE_ID", "MOBILE_NO", "USER_ID", "LEAD_ID"];

function todayStamp() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/** Writes to the local JSON fallback. */
function storeToLocalFile(event) {
  const baseDir = path.join(process.cwd(), "data", "call_status_logs");
  const byLeadDir = path.join(baseDir, "by-lead");
  if (!fs.existsSync(byLeadDir)) fs.mkdirSync(byLeadDir, { recursive: true });

  const dailyFile = path.join(baseDir, `${todayStamp()}.jsonl`);
  fs.appendFileSync(dailyFile, JSON.stringify(event) + "\n");

  const safeLeadKey = String(event.LEAD_ID).replace(/[^A-Za-z0-9_.-]/g, "_");
  fs.writeFileSync(path.join(byLeadDir, `${safeLeadKey}.json`), JSON.stringify(event));
}

/**
 * Forwards the ConVox event to Blinkr's own call-status webhook
 * (POST /api/webhook/v1/call_status), once configured. Returns true if it
 * was accepted, false if it should fall back to the local file (URL not
 * configured yet, network error, or non-2xx).
 *
 * That endpoint expects its own small shape — { call_id, status, mobile } —
 * not ConVox's raw field names, so this maps between the two.
 */
async function storeViaBackendApi(payload) {
  const url = process.env.CALL_STATUS_STORE_API_URL;
  if (!url) return false; // not provided yet — caller falls back to file

  const body = {
    call_id: payload.CALL_REFERENCE_ID,
    status: payload.CALL_STATUS,
    mobile: payload.MOBILE_NO,
  };

  try {
    const token = await getCallStatusAccessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[/api/convox/call-status] backend store API returned ${res.status}:`, await res.text().catch(() => ""));
    }
    return res.ok;
  } catch (err) {
    console.error("[/api/convox/call-status] backend store API failed:", err?.message || err);
    return false;
  }
}

export async function POST(request) {
  try {
    if (!convoxIncomingRequestAuthorized(request.headers)) {
      return NextResponse.json(
        { status: "error", message: "Invalid or expired access token." },
        { status: 401 }
      );
    }

    let payload = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { status: "error", message: "Invalid parameters or missing fields" },
        { status: 400 }
      );
    }

    const missing = REQUIRED_FIELDS.filter((f) => !String(payload[f] ?? "").trim());
    if (missing.length) {
      return NextResponse.json(
        { status: "error", message: "Invalid parameters or missing fields" },
        { status: 400 }
      );
    }

    const event = { ...payload, received_at: Math.floor(Date.now() / 1000) };

    try {
      const savedViaApi = await storeViaBackendApi(payload);
      if (!savedViaApi) {
        storeToLocalFile(event); // API not ready yet, or it failed — don't lose the event
      }
    } catch (err) {
      console.error("[/api/convox/call-status] store failed, falling back to file:", err?.message || err);
      try {
        storeToLocalFile(event);
      } catch (fileErr) {
        console.error("[/api/convox/call-status] file fallback also failed:", fileErr?.message || fileErr);
        return NextResponse.json(
          { status: "error", message: "An unexpected error occurred." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ status: "success", message: "Call status updated successfully" });
  } catch (err) {
    console.error("[/api/convox/call-status]", err?.message || err);
    return NextResponse.json(
      { status: "error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
