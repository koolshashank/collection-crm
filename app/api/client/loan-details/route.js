import { NextResponse } from "next/server";
import { apiGet } from "@/lib/serverApi";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/client/loan-details?lead_id=…
 * Port of client_info.php step 1: GET {apiBase}/getLoanDetails/{leadId}.
 * Returns the upstream body unchanged (shape: { data: {...loan} }).
 */
export async function GET(request) {
  try {
    const leadId = (new URL(request.url).searchParams.get("lead_id") || "").trim();
    if (!leadId) {
      return NextResponse.json({ success: false, message: "Invalid Lead ID." }, { status: 400 });
    }
    const res = await apiGet("get_loan_details", { suffix: encodeURIComponent(leadId), timeoutMs: 15000 });
    if (res.error) {
      return NextResponse.json({ success: false, message: res.error }, { status: 502 });
    }

    const session = getSession();
    if (session) {
      logActivity({
        session,
        action: "customer_viewed",
        category: "view",
        entity: { type: "lead", id: leadId },
      });
    }

    return NextResponse.json(res.data ?? {}, { status: res.status || 200 });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load loan details." }, { status: 500 });
  }
}
