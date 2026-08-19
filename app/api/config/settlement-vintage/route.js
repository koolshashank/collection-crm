import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readSettlementVintagePolicy, writeSettlementVintagePolicy } from "@/lib/settlementVintagePolicy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/settlement-vintage — admin-editable table of "settlement % of
 * outstanding" per DPD/vintage bucket. Used only to show a suggested amount
 * when a settlement request is raised — never wired into what actually gets
 * submitted/approved.
 * GET  → { success: true, config: { enabled, percents, updatedAt } }
 * POST { enabled, percents } → admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD)
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
  return NextResponse.json({ success: true, config: readSettlementVintagePolicy() });
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

  const { ok, config } = writeSettlementVintagePolicy(body);
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
    meta: { config: "settlement_vintage", enabled: config.enabled, percents: config.percents },
  });
  return NextResponse.json({ success: true, config, message: "Settlement vintage policy saved" });
}
