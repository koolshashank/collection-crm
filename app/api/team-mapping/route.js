import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readTeamMapping, writeTeamMapping } from "@/lib/teamMappingStore";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/team-mapping — Team Leader <-> staff drag-and-drop assignment.
 * GET  → { success: true, tlIds, mapping }
 * POST { tlIds, mapping } → admin only (ADMIN / COLLECTION-HEAD)
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD");
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { tlIds, mapping } = readTeamMapping();
  return NextResponse.json({ success: true, tlIds, mapping });
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

  const { tlIds, mapping } = writeTeamMapping(body);

  logActivity({
    session,
    action: "team_mapping_changed",
    category: "teams",
    meta: { tl_count: tlIds.length, mapped_count: Object.values(mapping).reduce((n, m) => n + m.length, 0) },
  });

  return NextResponse.json({ success: true, tlIds, mapping, message: "Team mapping saved" });
}
