/**
 * GET /api/convox/check-active-call?since=1729412345 — port of check_active_call.php.
 *
 * Polled every few seconds from the agent's browser to detect a new Call
 * PopUp event written by the ConVox incoming receiver
 * (/api/convox/incoming-auth). Returns the event only if it's newer than
 * `since` (avoids re-popping the same call repeatedly).
 */

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { convoxResolveUserId } from "@/lib/convox";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    /* Use the ConVox User ID mapped to this CRM session (same mapping used
       for Click-to-Call) so the poll matches what ConVox sends as agent_id */
    const crmEmail = session.username ?? "";
    const agentId = convoxResolveUserId(crmEmail);

    if (!agentId) {
      return NextResponse.json({ success: false, message: "No ConVox agent mapping for this user." });
    }

    const since = parseInt(request.nextUrl.searchParams.get("since") ?? "0", 10) || 0;

    const safeAgentKey = String(agentId).replace(/[^A-Za-z0-9_.-]/g, "_");
    const file = path.join(process.cwd(), "data", "active_calls", safeAgentKey + ".json");

    if (!fs.existsSync(file)) {
      return NextResponse.json({ success: true, has_new: false });
    }

    let event = null;
    try {
      event = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      event = null;
    }

    if (!event || typeof event !== "object" || (event.received_at ?? 0) <= since) {
      return NextResponse.json({ success: true, has_new: false });
    }

    return NextResponse.json({ success: true, has_new: true, event });
  } catch (err) {
    console.error("[/api/convox/check-active-call]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
