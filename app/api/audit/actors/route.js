import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listRecentActors } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/** /api/audit/actors — distinct employees seen recently, for the filter dropdown. */
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
  return NextResponse.json({ success: true, actors: listRecentActors() });
}
