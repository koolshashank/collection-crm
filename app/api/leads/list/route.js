import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerUrl } from "@/lib/apiConfig";

/**
 * Loan Portfolio list — port of the server-side curl in lead.php.
 *
 * PHP called:
 *   https://api.blinkrloan.com/api/paytracker/v1/portfolio/getLoanList1/portfolio?<params>
 * with Bearer $_SESSION['jwt_token'] and a 10s timeout.
 *
 * Query params accepted here mirror lead.php's $_GET names; `search` is
 * translated to the backend's `search_text` exactly like the PHP did.
 */

export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sp = new URL(request.url).searchParams;
    const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get("limit") || "10", 10) || 10, 1);

    const params = new URLSearchParams({ page: String(page), limit: String(limit) });

    // Core filters — exact param names the API expects (same mapping as lead.php)
    const search = (sp.get("search") || "").trim();
    if (search) params.set("search_text", search);

    const passThrough = [
      "city",
      "state",
      "agent_name",
      "salary_date_from",
      "salary_date_to",
      "repayment_amount_min",
      "repayment_amount_max",
      "repayment_date_from",
      "repayment_date_to",
      "dpd_min",
      "dpd_max",
      "dpd_bucket",
    ];
    for (const key of passThrough) {
      const v = sp.get(key);
      if (v !== null && v !== "") params.set(key, v);
    }

    const url = paytrackerUrl(`portfolio/getLoanList1/portfolio?${params.toString()}`);

    const res = await rawGet(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.jwt_token}`,
      },
      timeoutMs: 10000, // CURLOPT_TIMEOUT => 10 in lead.php
    });

    if (res.error) {
      return NextResponse.json({ success: false, message: res.error }, { status: 502 });
    }

    const data = typeof res.data === "object" && res.data !== null ? res.data : {};
    // Same consumption as lead.php: leads + pagination straight from the backend
    return NextResponse.json(
      {
        success: true,
        leads: data.leads ?? [],
        pagination: data.pagination ?? {},
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
