import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";
import { API_BASE_URL } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/assign/unassigned — mirror of assign_lead.php's server-side fetch.
 * PHP behaviour: when a search term is present it sends ONLY ?search_text=…,
 * otherwise it sends ?page=…&limit=… (limit fixed at 10 on the page).
 * Backend: api_helper key `loan_list_unassigned` → collection/getLoanList1/unassignedactive
 */
export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1);
    const search = (searchParams.get("search") || "").trim();

    const params = search !== "" ? { search_text: search } : { page, limit };
    const res = await apiGet("loan_list_unassigned", { params });

    if (!res.ok || res.data === null || typeof res.data !== "object") {
      // Same diagnostic spirit as the PHP page's warning banner.
      return NextResponse.json(
        {
          success: false,
          message:
            "Could not reach the leads API (HTTP " +
            (res.status || "no response") +
            `). This usually means this server cannot reach ${new URL(API_BASE_URL).host} — ` +
            "check network/firewall/VPN access from this machine, or confirm the API is up.",
          leads: [],
          pagination: null,
        },
        { status: 502 }
      );
    }

    const data = res.data;
    if (!("leads" in data)) {
      return NextResponse.json({
        success: true,
        warning:
          'The API responded, but its shape was unexpected (no "leads" key). Raw response keys: ' +
          Object.keys(data).join(", ") +
          ".",
        ...data,
        leads: [],
      });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Unexpected server error while loading unassigned leads" },
      { status: 500 }
    );
  }
}
