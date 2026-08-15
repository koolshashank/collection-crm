import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readSmartPrioritizationPolicy, writeSmartPrioritizationPolicy } from "@/lib/smartPrioritizationPolicy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/smart-prioritization — global switch for the rule-based
 * borrower priority scoring feature (Leads list column + client-info
 * recommended-approach card).
 * GET  → { success: true, config: { enabled } }
 * POST { enabled: true|false } → admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD)
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
  return NextResponse.json({ success: true, config: readSmartPrioritizationPolicy() });
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

  const { ok, config } = writeSmartPrioritizationPolicy(body);
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
    meta: { config: "smart_prioritization", enabled: config.enabled },
  });
  return NextResponse.json({ success: true, config, message: "Smart Prioritization setting saved" });
}
