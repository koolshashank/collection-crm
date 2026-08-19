import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";
import { readDocumentHeaderFooterConfig, writeDocumentHeaderFooterConfig } from "@/lib/documentHeaderFooterConfig";

export const dynamic = "force-dynamic";

/**
 * /api/config/document-header-footer — the header/footer banner images
 * stamped onto generated documents (NOC PDF today; other document types
 * later). GET is session-gated only, since the NOC preview screen (any
 * logged-in user) needs to know which images to show. POST is admin only
 * (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD — same gate as the Settings
 * page itself and /api/config/round-robin).
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
  return NextResponse.json({ success: true, config: readDocumentHeaderFooterConfig() });
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Only admins can change the document header/footer." }, { status: 403 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const result = writeDocumentHeaderFooterConfig(body);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }

  logActivity({
    session,
    action: "settings_changed",
    category: "settings",
    meta: {
      config: "document_header_footer",
      hasHeader: !!result.config.headerUrl,
      hasFooter: !!result.config.footerUrl,
    },
  });

  return NextResponse.json({ success: true, config: result.config, message: "Document header/footer saved." });
}
