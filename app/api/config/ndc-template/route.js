import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { NDC_PLACEHOLDERS, NDC_TEMPLATE_DEFAULTS, readNdcTemplate, writeNdcTemplate } from "@/lib/ndcTemplate";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/ndc-template — admin-editable No Dues Certificate text.
 * Read by lib/ndc/pdf.js at generation time.
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
    config: readNdcTemplate(),
    defaults: NDC_TEMPLATE_DEFAULTS,
    placeholders: NDC_PLACEHOLDERS,
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

  const { ok, config } = writeNdcTemplate(body);
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
    meta: { config: "ndc_template" },
  });
  return NextResponse.json({ success: true, config, message: "NDC template saved" });
}
