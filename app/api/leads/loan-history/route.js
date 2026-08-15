import { NextResponse } from "next/server";
import { proxyLegacy } from "@/app/api/_legacy/legacyProxy";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/leads/loan-history?loan_id=…  (was loan_history_proxy.php)
 * TODO(legacy): loan_history_proxy.php source was NOT included in the
 * migration bundle — this proxies to ${LEGACY_PHP_BASE_URL}/loan_history_proxy.php
 * when set, otherwise returns 501.
 */
export async function GET(request) {
  const loanId = new URL(request.url).searchParams.get("loan_id");
  if (!loanId) {
    return NextResponse.json({ success: false, message: "loan_id required" }, { status: 400 });
  }

  const session = getSession();
  if (session) {
    logActivity({
      session,
      action: "loan_history_viewed",
      category: "view",
      entity: { type: "loan", id: loanId },
    });
  }

  return proxyLegacy(request, "loan_history_proxy.php");
}
