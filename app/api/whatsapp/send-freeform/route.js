/**
 * POST /api/whatsapp/send-freeform — port of send_whatsapp_freeform_action.php.
 * Body: { phone, content }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendWhatsappFreeformDootiq } from "@/lib/whatsapp/dootiq";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let input = {};
    try {
      input = await request.json();
    } catch {
      input = {};
    }

    const phone = String(input?.phone ?? "").trim();
    const content = String(input?.content ?? "").trim();

    if (!phone || !content) {
      return NextResponse.json({ success: false, message: "Phone and message content are required." });
    }

    /* Dootiq tracks this send in its own conversation history automatically. */
    const result = await sendWhatsappFreeformDootiq(phone, content);
    logActivity({
      session,
      action: "whatsapp_sent_freeform",
      category: "whatsapp",
      meta: { phone },
      success: Boolean(result?.success),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/whatsapp/send-freeform]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
