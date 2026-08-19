import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readRoundRobinPolicy, writeRoundRobinPolicy } from "@/lib/roundRobinPolicy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/round-robin — global switch for the Round Robin Distribution
 * card on the Assign Leads page.
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
  return NextResponse.json({ success: true, config: readRoundRobinPolicy() });
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

  const { ok, config } = writeRoundRobinPolicy(body);
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
    meta: { config: "round_robin", enabled: config.enabled },
  });
  return NextResponse.json({ success: true, config, message: "Round Robin setting saved" });
}
