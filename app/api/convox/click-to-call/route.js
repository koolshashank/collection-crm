/**
 * POST /api/convox/click-to-call — port of convox_click_to_call_action.php.
 * Body: { "phone_number": "9876543210", "refno": "BLKR00041001" }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  convoxResolveUserId,
  convoxGetLocationForEmail,
  convoxTriggerCall,
} from "@/lib/convox";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    /* Must be logged in */
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

    const phoneNumber = String(input?.phone_number ?? "").trim();
    const refno = String(input?.refno ?? "").trim();

    if (!phoneNumber || !refno) {
      return NextResponse.json({ success: false, message: "Phone number and reference ID are required." });
    }

    /* Resolve CRM login (email) → ConVox internal "User ID"
       (e.g. lalit.kumar@blinkrloan.com → LALIT). Mapping lives in lib/convox.js */
    const crmEmail = session.username ?? "";
    if (!crmEmail) {
      return NextResponse.json({ success: false, message: "Agent identity not found in session." });
    }

    const convoxUserId = convoxResolveUserId(crmEmail);
    if (!convoxUserId) {
      return NextResponse.json({
        success: false,
        message:
          "No ConVox User ID mapped for " +
          crmEmail +
          ". Add this agent to CONVOX_USER_ID_MAP in includes/convox_click_to_call.php.",
      });
    }

    /* Resolve which ConVox server (Location 1 or 2) this agent's account lives on */
    const location = convoxGetLocationForEmail(crmEmail);

    const result = await convoxTriggerCall(convoxUserId, phoneNumber, refno, location);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/convox/click-to-call]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
