import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { forwardLegacyPost } from "../legacyProxy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/assign/process — proxy for process_assign.php (source NOT in bundle).
 * Fields (unchanged from the PHP page):
 *   loan_ids[]  — array of lead ids (bulk)  OR  loan_ids — single lead id
 *   assignTo    — employee id
 */
export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const res = await forwardLegacyPost(request, "process_assign.php");

  const result = await res
    .clone()
    .json()
    .catch(() => null);
  const success = res.status >= 200 && res.status < 300 && result?.success !== false;
  logActivity({
    session,
    action: "lead_assigned",
    category: "assignment",
    meta: { assign_to: body?.assignTo, loan_ids: body?.loan_ids },
    success,
  });

  return res;
}
