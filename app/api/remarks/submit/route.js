import { NextResponse } from "next/server";
import { proxyLegacy } from "@/app/api/_legacy/legacyProxy";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

/**
 * POST /api/remarks/submit  (was submit_remarks.php)
 * Body: { lead_id, loan_id, remark_date, remark_type, remark_text, followup_date, mobile }
 * TODO(legacy): submit_remarks.php source was NOT included in the migration
 * bundle — this proxies to ${LEGACY_PHP_BASE_URL}/submit_remarks.php when set,
 * otherwise returns 501.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.clone().json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.remark_type || !body?.remark_date || !body?.remark_text) {
    return NextResponse.json(
      { success: false, message: "remark_type, remark_date and remark_text are required" },
      { status: 400 }
    );
  }
  const res = await proxyLegacy(request, "submit_remarks.php");

  const session = getSession();
  if (session) {
    const result = await res
      .clone()
      .json()
      .catch(() => null);
    logActivity({
      session,
      action: "remark_added",
      category: "other",
      entity: body?.lead_id ? { type: "lead", id: body.lead_id } : null,
      meta: { remark_type: body?.remark_type },
      success: res.status >= 200 && res.status < 300 && result?.success !== false,
    });
  }

  return res;
}
