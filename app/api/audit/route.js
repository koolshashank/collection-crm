import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryAuditLog, getAuditStats } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/audit — project-wide employee activity trail.
 * GET ?employeeId=&action=&category=&from=&to=&search=&page=&limit= → paginated entries
 * GET ?mode=stats → all-time headline numbers for the stat cards
 * Admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD).
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
}

export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;

  if (sp.get("mode") === "stats") {
    return NextResponse.json({ success: true, stats: getAuditStats() });
  }

  const result = queryAuditLog({
    employeeId: sp.get("employeeId") || undefined,
    action: sp.get("action") || undefined,
    category: sp.get("category") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    search: sp.get("search") || undefined,
    page: Number(sp.get("page")) || 1,
    limit: Math.min(Number(sp.get("limit")) || 50, 200),
  });

  return NextResponse.json({ success: true, ...result });
}
