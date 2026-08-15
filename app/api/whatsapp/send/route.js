/**
 * POST /api/whatsapp/send — port of send_whatsapp_action.php.
 * Body: { phone, template_name, language?, variables? }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendWhatsappTemplateDootiq } from "@/lib/whatsapp/dootiq";
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
    const templateName = String(input?.template_name ?? "").trim();
    const language = String(input?.language ?? "en").trim();
    const variables = input?.variables ?? {};

    if (!phone || !templateName) {
      return NextResponse.json({ success: false, message: "Phone and template are required." });
    }

    /* Dootiq tracks this send in its own conversation history automatically —
       no local logging needed, the chat screen fetches live from their API. */
    const result = await sendWhatsappTemplateDootiq(phone, templateName, variables, language);
    logActivity({
      session,
      action: "whatsapp_sent",
      category: "whatsapp",
      meta: { phone, template_name: templateName },
      success: Boolean(result?.success),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/whatsapp/send]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
