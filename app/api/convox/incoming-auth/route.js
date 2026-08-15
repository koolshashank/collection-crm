/**
 * POST /api/convox/incoming-auth — receiver for requests COMING FROM ConVox
 * (Call PopUp API / Call Status API), authenticated with the secret WE
 * define and hand to Deepija (Access-Token header or Authorization: Bearer).
 *
 * Port of includes/convox_incoming_auth.php (validation + the documented
 * 401/400 error shapes) plus the call_popup_endpoint behaviour referenced
 * by check_active_call.php: the validated event is written to
 * data/active_calls/<agent_id>.json with received_at (unix ts) so
 * /api/convox/check-active-call can pick it up.
 *
 * ⚠️ DEPLOYMENT NOTE: ConVox calls this WITHOUT a CRM session cookie —
 * this path must be whitelisted in middleware.js PUBLIC_API (shared file,
 * not edited here) or ConVox's requests will be rejected by the middleware
 * before reaching this handler.
 */

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { convoxIncomingRequestAuthorized } from "@/lib/convox";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    if (!convoxIncomingRequestAuthorized(request.headers)) {
      /* Standard 401 error shape documented by Deepija */
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
      /* Standard 400 error shape documented by Deepija */
      return NextResponse.json(
        { status: "error", message: "Invalid parameters or missing fields." },
        { status: 400 }
      );
    }

    const agentId = String(payload.agent_id ?? payload.userid ?? "").trim();
    if (!agentId) {
      return NextResponse.json(
        { status: "error", message: "Invalid parameters or missing fields." },
        { status: 400 }
      );
    }

    const event = {
      ...payload,
      agent_id: agentId,
      received_at: Math.floor(Date.now() / 1000),
    };

    try {
      const dir = path.join(process.cwd(), "data", "active_calls");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const safeAgentKey = agentId.replace(/[^A-Za-z0-9_.-]/g, "_");
      fs.writeFileSync(path.join(dir, safeAgentKey + ".json"), JSON.stringify(event));
    } catch (err) {
      console.error("[/api/convox/incoming-auth] store failed:", err?.message || err);
      return NextResponse.json(
        { status: "error", message: "Could not store call event." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("[/api/convox/incoming-auth]", err?.message || err);
    return NextResponse.json(
      { status: "error", message: "Internal server error." },
      { status: 500 }
    );
  }
}
