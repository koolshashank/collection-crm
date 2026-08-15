import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

/**
 * GET /api/ptp/emp-list — backend getEmpList via api_helper key `get_emp_list`.
 * Returns the backend body as-is (employee list may live under
 * data / result / employees / list depending on backend version).
 */
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const res = await apiGet("get_emp_list");
    if (!res.ok || res.data === null || typeof res.data !== "object") {
      return NextResponse.json(
        { success: false, message: res.error || `Employee list request failed (HTTP ${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, ...res.data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unexpected server error while loading employees" },
      { status: 500 }
    );
  }
}
