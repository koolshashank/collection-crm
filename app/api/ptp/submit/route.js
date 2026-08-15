import { proxyLegacy } from "../../_client-info/legacy";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

// TODO(legacy): submit_ptp.php was not included in the migration bundle.
// The request body { lead_id, ptp_date, ptp_amount, action_taken,
// action_required, remarks } is forwarded unchanged to
// ${LEGACY_PHP_BASE_URL}/submit_ptp.php when that env var is set;
// otherwise this responds 501 JSON.
export async function POST(request) {
  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const res = await proxyLegacy(request, "submit_ptp.php");

  const session = getSession();
  if (session) {
    const result = await res
      .clone()
      .json()
      .catch(() => null);
    const success = res.status >= 200 && res.status < 300 && result?.success !== false;
    logActivity({
      session,
      action: "ptp_submitted",
      category: "ptp",
      entity: body?.lead_id ? { type: "lead", id: body.lead_id } : null,
      meta: { ptp_date: body?.ptp_date, ptp_amount: body?.ptp_amount, ptp_type: body?.ptp_type },
      success,
    });
  }

  return res;
}
