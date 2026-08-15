import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * Proxy of dashboard.php's portfolio-total fetch:
 *   GET .../collection/getLoanList1/portfolio?page=1&limit=1
 * Only pagination.totalItems is consumed by the dashboard.
 */
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const jwt = session.jwt_token;
    const res = await rawGet(
      apiUrl("collection/getLoanList1/portfolio?page=1&limit=1"),
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
