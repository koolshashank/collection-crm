import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  SETTLEMENT_LETTER_PLACEHOLDERS,
  SETTLEMENT_LETTER_TEMPLATE_DEFAULTS,
  readSettlementLetterTemplate,
  writeSettlementLetterTemplate,
} from "@/lib/settlementLetterTemplate";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/settlement-letter-template — admin-editable settlement offer
 * letter text (title, salutation, body paragraphs, amounts-table labels,
 * closing). Read by lib/settlementLetter/pdf.js at generation time.
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    config: readSettlementLetterTemplate(),
    defaults: SETTLEMENT_LETTER_TEMPLATE_DEFAULTS,
    placeholders: SETTLEMENT_LETTER_PLACEHOLDERS,
  });
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const { ok, config } = writeSettlementLetterTemplate(body);
  if (!ok) {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }

  logActivity({
    session,
    action: "settings_changed",
    category: "settings",
    meta: { config: "settlement_letter_template" },
  });
  return NextResponse.json({ success: true, config, message: "Settlement letter template saved" });
}
