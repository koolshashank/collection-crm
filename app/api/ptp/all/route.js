import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

/**
 * GET /api/ptp/all — mirror of ptp_details.php's server-side list fetch.
 * Uses the api_helper key `get_ptp_list` (collection/getPtpListAll) with the
 * exact same query params the PHP built:
 *   page, limit, search_text, ptp_status, ptp_date_from, ptp_date_to,
 *   amount_min, amount_max, agent_name
 *
 * Role check copied verbatim from ptp_details.php: non-privileged users may
 * only fetch when a search term is present.
 */
export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const ptpStatus = searchParams.get("ptp_status") || "all";
    const ptpFrom = searchParams.get("ptp_from") || null;
    const ptpTo = searchParams.get("ptp_to") || null;
    const amountMin = searchParams.get("amount_min");
    const amountMax = searchParams.get("amount_max");
    const agentName = searchParams.get("agent_name") || null;
    const limit = Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);

    const roles = session.roles ?? [];
    const isPrivilegedUser =
      roles.includes("ADMIN") ||
      roles.includes("COLLECTION-HEAD") ||
      roles.includes("RECOVERY_HEAD") ||
      roles.includes("COLLECTION-EXECUTIVE") ||
      roles.includes("ACM");

    if (!isPrivilegedUser && search === "") {
      return NextResponse.json(
        {
          success: false,
          restricted: true,
          message:
            "You don't have permission to view all PTPs. Use search to look up a specific record, or contact your administrator.",
        },
        { status: 403 }
      );
    }

    const params = { page, limit };
    if (search !== "") params.search_text = search;
    if (ptpStatus !== "all") params.ptp_status = ptpStatus;
    if (ptpFrom) params.ptp_date_from = ptpFrom;
    if (ptpTo) params.ptp_date_to = ptpTo;
    if (amountMin !== null && amountMin !== "") params.amount_min = amountMin;
    if (amountMax !== null && amountMax !== "") params.amount_max = amountMax;
    if (agentName) params.agent_name = agentName;

    const res = await apiGet("get_ptp_list", { params });
    if (!res.ok || res.data === null || typeof res.data !== "object") {
      return NextResponse.json(
        { success: false, message: res.error || `PTP list request failed (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, ...res.data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unexpected server error while loading PTP records" },
      { status: 500 }
    );
  }
}
