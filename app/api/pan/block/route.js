import { proxyLegacy } from "../../_client-info/legacy";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

// TODO(legacy): block_pan_action.php was not included in the migration bundle.
// Body { pan_number, reason } is forwarded unchanged to
// ${LEGACY_PHP_BASE_URL}/block_pan_action.php when that env var is set;
// otherwise this responds 501 JSON.
// The UI expects { status: "success"|"error", message } in the response.
export async function POST(request) {
  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const res = await proxyLegacy(request, "block_pan_action.php");

  const session = getSession();
  if (session) {
    const result = await res
      .clone()
      .json()
      .catch(() => null);
    logActivity({
      session,
      action: "pan_blocked",
      category: "other",
      meta: { pan_number: body?.pan_number, reason: body?.reason },
      success: res.status >= 200 && res.status < 300 && result?.status !== "error",
    });
  }

  return res;
}
