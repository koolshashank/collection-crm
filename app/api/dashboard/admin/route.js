import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { loansphereUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * Proxy of dashboard.php's admin dashboard summary fetch:
 *   GET https://api.blinkrloan.com/api/loansphere/adminDashboard?time=today
 * Forwards the ?time= query param as-is (defaults to "today" like the PHP call).
 */
export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const jwt = session.jwt_token;
    const time = request.nextUrl.searchParams.get("time") || "today";
    const res = await rawGet(
      loansphereUrl(`adminDashboard?time=${encodeURIComponent(time)}`),
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
