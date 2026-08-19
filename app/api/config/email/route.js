import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { EMAIL_CONFIG_DEFAULTS, readEmailConfigSafe, writeEmailConfig } from "@/lib/emailConfig";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/email — the SMTP account every outbound email in this app
 * (NOC, Settlement Letter, NDC) sends through. Admin-only for both GET and
 * POST since this carries a real password — unlike most other config
 * routes, which allow any signed-in user to GET.
 * GET  → { success, config (password stripped), defaults }
 * POST { host, port, user, pass?, secure, fromAddress, fromName, replyTo }
 *   — omit/blank `pass` to leave the current password unchanged.
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
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }
  const { pass: _pass, ...safeDefaults } = EMAIL_CONFIG_DEFAULTS;
  return NextResponse.json({ success: true, config: readEmailConfigSafe(), defaults: safeDefaults });
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

  const { ok, config } = writeEmailConfig(body);
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
    meta: { config: "email", passwordChanged: Boolean(body?.pass) },
  });
  const { pass: _pass, ...safeConfig } = config;
  return NextResponse.json({ success: true, config: { ...safeConfig, hasPassword: Boolean(config.pass) }, message: "Email configuration saved" });
}
