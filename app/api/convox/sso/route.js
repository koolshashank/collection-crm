/**
 * GET /api/convox/sso — builds the ConVox SSO widget URL for the logged-in
 * agent (server-side port of convox_sso.php + the top of convox_widget.php).
 * The SECRET key/IV never leave the server — only the final encrypted URL
 * is returned.
 *
 * Response: { success: true, url } or { success: false, message }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { convoxWidgetUrl } from "@/lib/convox";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    /* Same resolution as convox_widget.php: session user → email string */
    const crmUserEmail = String(session.username ?? "");
    if (!crmUserEmail) {
      return NextResponse.json({ success: false, message: "Agent identity not found in session." });
    }

    const url = convoxWidgetUrl(crmUserEmail);
    if (url === null) {
      /* Config problem — PHP silently skipped the widget in this case */
      return NextResponse.json({ success: false, message: "ConVox SSO is not configured." });
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("[/api/convox/sso]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
