/**
 * POST /api/convox/end-call — port of convox_end_call_action.php.
 * Body:
 * {
 *   "mobile": "9876543210",
 *   "refno": "BLKR00041001",
 *   "convox_id": "…",
 *   "disposition": "NI",
 *   "endcall_type": "CLOSE",
 *   "followup": { "enabled": true, "date": "2026-07-25", "hrs": "14", "mins": "30" }
 * }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  convoxResolveUserId,
  convoxGetLocationForEmail,
  convoxEndCall,
} from "@/lib/convox";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized — please log in again." },
        { status: 401 }
      );
    }

    let input = {};
    try {
      input = await request.json();
    } catch {
      input = {};
    }

    const mobile = String(input?.mobile ?? "").trim();
    const refno = String(input?.refno ?? "").trim();
    const convoxId = String(input?.convox_id ?? "").trim();
    const disposition = String(input?.disposition ?? "").trim();
    const endCallType = String(input?.endcall_type ?? "CLOSE").trim();
    const followUp = input?.followup ?? {};

    if (!mobile || !refno || !disposition) {
      return NextResponse.json({
        success: false,
        message: "Mobile, reference ID, and disposition are all required.",
      });
    }

    if (!convoxId) {
      return NextResponse.json({
        success: false,
        message: "No ConVox call session found — please dial via ConVox first.",
      });
    }

    const crmEmail = session.username ?? "";
    if (!crmEmail) {
      return NextResponse.json({ success: false, message: "Agent identity not found in session." });
    }

    const convoxUserId = convoxResolveUserId(crmEmail);
    if (!convoxUserId) {
      return NextResponse.json({
        success: false,
        message: "No ConVox User ID mapped for " + crmEmail + ".",
      });
    }

    const location = convoxGetLocationForEmail(crmEmail);

    const result = await convoxEndCall(
      location,
      convoxUserId,
      mobile,
      refno,
      disposition,
      endCallType,
      "ConVoxProcess",
      followUp,
      convoxId, // convoxid — the real ID ConVox returned from Click-to-Call
      convoxId // callreferenceid — using the same value (only one ID was returned)
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/convox/end-call]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
