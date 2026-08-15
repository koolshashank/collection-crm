import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readTwoFactorPolicy, writeTwoFactorPolicy } from "@/lib/twoFactorPolicy";
import { bumpSessionEpoch } from "@/lib/sessionEpoch";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/2fa — global switch: is a TOTP code required for every login?
 * GET  → { success: true, config: { required } }
 * POST { required: true|false } → admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD)
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
  return NextResponse.json({ success: true, config: readTwoFactorPolicy() });
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

  const wasRequired = readTwoFactorPolicy().required;
  const { ok, config } = writeTwoFactorPolicy(body);
  if (!ok) {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }

  const justEnabled = !wasRequired && config.required;
  if (justEnabled) {
    bumpSessionEpoch();
  }

  logActivity({
    session,
    action: "settings_changed",
    category: "settings",
    meta: { config: "2fa_policy", required: config.required, forced_logout: justEnabled },
  });
  return NextResponse.json({
    success: true,
    config,
    message: justEnabled
      ? "Two-factor policy saved. Everyone has been signed out and must log in again."
      : "Two-factor policy saved",
  });
}
