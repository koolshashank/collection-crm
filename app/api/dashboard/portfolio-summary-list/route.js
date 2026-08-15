import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerDevUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * Mirror of portfolio_summary_list.php.
 *
 * Proxies the Loan Portfolio dashboard-card click-through to the real
 * paytracker portfolio-summary API, per category:
 *
 *   GET https://dev.api.blinkrloan.com/api/paytracker/v1/portfolio/portfolio-summary/{category}
 *   category ∈ all | fresh | reloan | active | closed | ptp
 *
 * Query params forwarded as-is: search_text, state, city, page, limit,
 * ptp_status, dpd_bucket (page defaults to 1, limit to 10).
 * The upstream response is passed straight through, unmodified.
 */
const ALLOWED_CATEGORIES = ["all", "fresh", "reloan", "active", "closed", "ptp"];
const FORWARDED_PARAMS = ["search_text", "state", "city", "page", "limit", "ptp_status", "dpd_bucket"];

export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    const jwt = session.jwt_token;
    const sp = request.nextUrl.searchParams;

    let category = sp.get("category") || "all";
    if (!ALLOWED_CATEGORIES.includes(category)) category = "all";

    /* Forward only the params the real API expects, and only if present */
    const params = new URLSearchParams();
    for (const key of FORWARDED_PARAMS) {
      const v = sp.get(key);
      if (v !== null && v !== "") params.set(key, v);
    }
    if (!params.has("page")) params.set("page", "1");
    if (!params.has("limit")) params.set("limit", "10");

    const url = paytrackerDevUrl(
      `portfolio/portfolio-summary/${encodeURIComponent(category)}?${params.toString()}`
    );

    const res = await rawGet(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/json",
      },
      timeoutMs: 15000,
    });

    if (res.status === 0 || res.data === null) {
      return NextResponse.json(
        { success: false, message: "Could not reach portfolio-summary API: " + (res.error || `HTTP ${res.status}`) },
        { status: 502 }
      );
    }

    /* Pass the real response straight through — the frontend unwraps
       whichever shape it turns out to be. */
    return NextResponse.json(res.data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
