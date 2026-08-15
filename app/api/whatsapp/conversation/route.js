/**
 * GET /api/whatsapp/conversation?phone=+91... — port of get_whatsapp_conversation.php.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dootiqGetConversationByPhone } from "@/lib/whatsapp/dootiq";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const phone = String(request.nextUrl.searchParams.get("phone") ?? "").trim();
    if (!phone) {
      return NextResponse.json({ success: false, message: "Phone number is required." });
    }

    /* Dootiq is the source of truth for conversation history — no local
       storage needed, always fetched live so it's guaranteed accurate. */
    const result = await dootiqGetConversationByPhone(phone);

    return NextResponse.json({
      success: result.success,
      messages: result.messages,
      message: result.message,
    });
  } catch (err) {
    console.error("[/api/whatsapp/conversation]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
