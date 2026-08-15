import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryCallStatusLogs } from "@/lib/callStatusStore";

/**
 * GET /api/call-reports/list — paginated, filterable list of every ConVox
 * call-status event received so far (see app/api/convox/call-status).
 * Requires a logged-in CRM session (unlike the ConVox webhook itself).
 */
export async function GET(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const result = queryCallStatusLogs({
    search: sp.get("search") || "",
    disposition: sp.get("disposition") || "",
    agent: sp.get("agent") || "",
    from: sp.get("from") || "",
    to: sp.get("to") || "",
    page: Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1),
    limit: Math.max(parseInt(sp.get("limit") || "25", 10) || 25, 1),
  });

  return NextResponse.json({ success: true, ...result });
}
