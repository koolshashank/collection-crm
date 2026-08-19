import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { loansphereUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * Proxy of bsa.php's fetch:
 *   GET https://api.blinkrloan.com/api/loansphere/lead/third-party-api-data/{lead_id}?api_type=bsa
 */
export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const leadId = (request.nextUrl.searchParams.get("lead_id") || "").trim();
    if (!leadId) {
      return NextResponse.json({ success: false, message: "lead_id is required." }, { status: 400 });
    }
    const jwt = session.jwt_token;
    const res = await rawGet(
      loansphereUrl(`lead/third-party-api-data/${encodeURIComponent(leadId)}`, { api_type: "bsa" }),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${jwt}`,
          Cookie: `employee_jwt=${jwt}`,
        },
        timeoutMs: 30000,
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
