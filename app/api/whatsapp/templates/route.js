/**
 * GET /api/whatsapp/templates — templates fetched LIVE from Dootiq,
 * mapped exactly like the PHP block at the top of whatsapp_template_modal.php
 * (this replaces the server-rendered LP_WA_TEMPLATES variable — the client
 * template modal fetches this instead).
 *
 * Response: { success, templates: { [name]: { label, language, preview,
 *   variables:[{key,label,source,example,position}] } }, message }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLiveTemplatesForModal } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const result = await getLiveTemplatesForModal("APPROVED", 100);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/whatsapp/templates]", err?.message || err);
    return NextResponse.json(
      { success: false, templates: {}, message: "Internal server error." },
      { status: 500 }
    );
  }
}
