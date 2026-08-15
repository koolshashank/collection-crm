import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { forwardLegacyGet, forwardLegacyPost } from "../../assign/legacyProxy";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/settings/loan-correction — proxy for loan_correction_proxy.php
 * (source NOT in the migration bundle). Used by the Settings → Loan
 * Correction card:
 *   GET  ?loan_no=BLKR…                          → loan details + payments
 *   POST { loan_no, action:'reopen_only', confirm_reopen, reason }
 *   POST { loan_no, payment_id, action:'delete', reason }
 */
export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return forwardLegacyGet(request, "loan_correction_proxy.php");
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const res = await forwardLegacyPost(request, "loan_correction_proxy.php");

  const result = await res
    .clone()
    .json()
    .catch(() => null);
  const success = res.status >= 200 && res.status < 300 && result?.success !== false;
  logActivity({
    session,
    action: body?.action === "delete" ? "loan_correction_delete_payment" : "loan_correction_reopen",
    category: "loan_correction",
    entity: body?.loan_no ? { type: "loan", id: body.loan_no } : null,
    meta: { reason: body?.reason, payment_id: body?.payment_id },
    success,
  });

  return res;
}
