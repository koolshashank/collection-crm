import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PAGE_SETTINGS_SCHEMA, readPageSettings, writePageSettings } from "@/lib/pageSettings";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/page-settings — generic per-page display settings (see
 * lib/pageSettings.js for the schema registry all of this is driven off).
 * GET  → { success: true, schema, settings } — any signed-in user (pages
 *         need this just to render themselves correctly).
 * POST { settings: { pageKey: { fieldKey: value } } } → admin only.
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
  return NextResponse.json({ success: true, schema: PAGE_SETTINGS_SCHEMA, settings: readPageSettings() });
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

  const { ok, settings } = writePageSettings(body.settings ?? {});
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
    meta: { config: "page_settings", pages: Object.keys(body.settings ?? {}) },
  });
  return NextResponse.json({ success: true, settings, message: "Page settings saved" });
}
