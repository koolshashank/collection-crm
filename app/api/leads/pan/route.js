import { NextResponse } from "next/server";
import { proxyLegacy } from "@/app/api/_legacy/legacyProxy";

/**
 * GET /api/leads/pan?lead_id=…  (was get_lead_pan.php)
 * TODO(legacy): get_lead_pan.php source was NOT included in the migration
 * bundle — this proxies to ${LEGACY_PHP_BASE_URL}/get_lead_pan.php when set,
 * otherwise returns 501.
 */
export async function GET(request) {
  const leadId = new URL(request.url).searchParams.get("lead_id");
  if (!leadId) {
    return NextResponse.json({ success: false, message: "lead_id required" }, { status: 400 });
  }
  return proxyLegacy(request, "get_lead_pan.php");
}
