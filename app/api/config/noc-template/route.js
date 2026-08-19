import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { NOC_PLACEHOLDERS, NOC_TEMPLATE_DEFAULTS, readNocTemplate, writeNocTemplate } from "@/lib/nocTemplate";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/noc-template — admin-editable NOC certificate text (title,
 * salutation, body paragraphs, closing). Read by lib/noc/pdf.js at
 * generation time; see NOC_PLACEHOLDERS for the {tokens} each string may use.
 * GET  → { success, config, defaults, placeholders }
 * POST { title, salutation, greeting, paragraphs, closingRegards, closingTeam, closingCompany } → admin only
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
    config: readNocTemplate(),
    defaults: NOC_TEMPLATE_DEFAULTS,
    placeholders: NOC_PLACEHOLDERS,
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

  const { ok, config } = writeNocTemplate(body);
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
    meta: { config: "noc_template" },
  });
  return NextResponse.json({ success: true, config, message: "NOC template saved" });
}
