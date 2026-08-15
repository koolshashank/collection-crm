import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerDevUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * Proxy of dashboard.php's DPD-bucket source:
 *   GET https://dev.api.blinkrloan.com/api/paytracker/v1/portfolio/portfolio-summary
 * Shape: { summary: { totalLeads, activeCases,
 *          dpdBucketDistribution: [ {bucket,label,count}, … ] } }
 */
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const jwt = session.jwt_token;
    const res = await rawGet(
      paytrackerDevUrl("portfolio/portfolio-summary"),
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
