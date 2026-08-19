import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads/assignment-info?lead_id=&loan_no= — best-effort "when was
 * this case assigned" lookup for the customer one-pager's Case Assignment
 * card. There's no assigned-date field on the loan record itself (asked
 * upstream, not available), so this looks for the most recent "assignment"
 * category audit-log entry that mentions this lead/loan.
 *
 * Only /api/assign/process (single manual assign) records the specific
 * loan_ids in its audit meta — bulk-assign and round-robin log counts only,
 * not which leads — so this will often find nothing even for a genuinely
 * assigned case. `found: false` means exactly that: no matching entry, not
 * "never assigned". The one-pager should show that distinction, not hide it.
 */
export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const leadId = (sp.get("lead_id") || "").trim();
  const loanNo = (sp.get("loan_no") || "").trim();
  const term = loanNo || leadId;
  if (!term) {
    return NextResponse.json({ success: false, message: "lead_id or loan_no is required." }, { status: 400 });
  }

  const { entries } = queryAuditLog({ category: "assignment", search: term, page: 1, limit: 1 });
  const latest = entries[0] || null;

  return NextResponse.json({
    success: true,
    found: Boolean(latest),
    assignedOn: latest?.ts ?? null,
    assignedByAudit: latest?.actor?.name ?? latest?.actor?.username ?? null,
    action: latest?.action ?? null,
  });
}
