import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readLoginAlertConfig, writeLoginAlertConfig } from "@/lib/loginAlertConfig";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/login-alerts — recipients emailed whenever a login attempt
 * fails. GET/POST both admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD).
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
  return NextResponse.json({ success: true, config: readLoginAlertConfig() });
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

  const { ok, config } = writeLoginAlertConfig(body);
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
    meta: { config: "login_alerts", enabled: config.enabled, recipients: config.recipients.length },
  });

  return NextResponse.json({ success: true, config, message: "Login alert settings saved" });
}
