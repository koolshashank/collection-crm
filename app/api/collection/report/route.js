import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Proxy of collection.php's server-side fetch:
 *   GET https://api.blinkrloan.com/api/paytracker/v1/portfolio/collection-report
 *       ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=N&perPage=N&search_text=…
 *
 * Same defaults as PHP: startDate = first of month, endDate = today,
 * page = 1, perPage = 10, endDate clamped to >= startDate.
 * Response passed straight through (summary / leads / pagination).
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
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const startDate = sp.get("startDate") || firstOfMonth;
    let endDate = sp.get("endDate") || today;
    if (endDate < startDate) endDate = startDate; /* Keep endDate >= startDate */
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const perPage = Math.max(1, parseInt(sp.get("perPage") || "10", 10) || 10);
    const search = (sp.get("search_text") ?? sp.get("search") ?? "").trim();

    const params = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
      perPage: String(perPage),
    });
    if (search !== "") params.set("search_text", search);

    const res = await rawGet(
      paytrackerUrl(`portfolio/collection-report?${params.toString()}`),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          Cookie: `employee_jwt=${jwt}`,
        },
        timeoutMs: 20000,
      }
    );

    if (res.status === 0) {
      return NextResponse.json({ success: false, message: `Connection error (${res.error || "network"}).` }, { status: 502 });
    }
    if (res.data === null || res.data === "") {
      return NextResponse.json({ success: false, message: `Empty response from server (HTTP ${res.status}).` }, { status: 502 });
    }
    if (typeof res.data === "string") {
      return NextResponse.json({ success: false, message: `Invalid JSON from server (HTTP ${res.status}).` }, { status: 502 });
    }
    return NextResponse.json(res.data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
