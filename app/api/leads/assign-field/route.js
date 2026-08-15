import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { proxyLegacy } from "@/app/api/_legacy/legacyProxy";
import { createFieldVisit } from "@/lib/fieldVisitStore";

/**
 * POST /api/leads/assign-field  (was assign_field.php)
 * Body: { lead_id, loan_id, agent_id, visit_date, priority, notes, ... }
 *
 * TODO(legacy): assign_field.php source was NOT included in the migration
 * bundle. When LEGACY_PHP_BASE_URL is set the request is proxied there
 * unchanged, exactly as before.
 *
 * When it ISN'T set, the assignment is recorded locally instead of failing
 * with a 501, so the "Assign to Field" modals on the Leads and Client Info
 * pages feed the same list the /field-visit page reads. Both paths keep the
 * same response shape the modals already expect.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.clone().json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.agent_id || !body?.visit_date) {
    return NextResponse.json(
      { success: false, message: "agent_id and visit_date are required" },
      { status: 400 }
    );
  }

  if (process.env.LEGACY_PHP_BASE_URL) {
    return proxyLegacy(request, "assign_field.php");
  }

  const session = getSession();
  const visit = createFieldVisit({
    ...body,
    assigned_by: session?.name || session?.username || "",
  });

  return NextResponse.json({
    success: true,
    message: "Field visit assigned successfully",
    visit,
  });
}
