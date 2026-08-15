/**
 * GET /api/notifier — backend for components/integrations/PopupNotifier.js.
 *
 * The PHP popup_notifier.php polled `check_popup.php`, which did NOT exist
 * in the source tree — every poll 404'd and the notifier silently treated
 * it as { popup: null } (its fetch handler mapped !r.ok → {popup:null}).
 * This route keeps the exact same response contract ({ popup: object|null })
 * so the card UI is fully wired the moment a real popup producer exists;
 * until then it returns { popup: null } — identical observable behaviour.
 *
 * Expected popup shape (from the popup_notifier.php renderer):
 * { type: "incoming"|"outgoing", name, mobile, loan_no?, lead_id?, ref?, process?, link }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ popup: null }, { status: 401 });
    }
    return NextResponse.json({ popup: null });
  } catch {
    return NextResponse.json({ popup: null });
  }
}
