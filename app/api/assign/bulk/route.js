import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { forwardLegacyPost } from "../legacyProxy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/assign/bulk — proxy for bulkAssignProcess.php (source NOT in bundle).
 * Multipart form-data, field `bulkFile` = CSV with columns loan_id, employee_id.
 */
export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const res = await forwardLegacyPost(request, "bulkAssignProcess.php");

  const result = await res
    .clone()
    .json()
    .catch(() => null);
  logActivity({
    session,
    action: "lead_assigned_bulk",
    category: "assignment",
    success: res.status >= 200 && res.status < 300 && result?.success !== false,
  });

  return res;
}
