import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerDevUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Proxy of dashboard.php's Top/Bottom performers fetch:
 *   GET https://dev.api.blinkrloan.com/api/paytracker/v1/dashboard/top-performers
 *       ?startDate=…&endDate=…&limit=5
 * Defaults mirror PHP: startDate = first of current month, endDate = today, limit = 5.
 * Response: { top5: [...], bottom5: [...] }
 */
export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const jwt = session.jwt_token;
    const sp = request.nextUrl.searchParams;
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const params = new URLSearchParams({
      startDate: sp.get("startDate") || firstOfMonth,
      endDate: sp.get("endDate") || today,
      limit: sp.get("limit") || "5",
    });
    const res = await rawGet(
      paytrackerDevUrl(`dashboard/top-performers?${params.toString()}`),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          Cookie: `employee_jwt=${jwt}`,
        },
        timeoutMs: 10000,
      }
    );
    if (res.status === 0) {
      return NextResponse.json({ success: false, message: res.error || "Upstream unreachable" }, { status: 502 });
    }
    return NextResponse.json(res.data ?? {}, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
