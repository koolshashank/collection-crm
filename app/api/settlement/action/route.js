import { NextResponse } from "next/server";
import { apiGet } from "@/lib/serverApi";
import { proxyLegacy } from "../../_client-info/legacy";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

/**
 * /api/settlement/action — port of settlement_action.php.
 *
 * ?action=get_emp_list is implemented for real against the core backend
 * (collection/getEmpList) — the upstream body is returned unchanged so the
 * client keeps reading res.data || res.result || res.employees.
 *
 * TODO(legacy): settlement_action.php (all other actions) was not included
 * in the migration bundle — those requests are forwarded unchanged to
 * ${LEGACY_PHP_BASE_URL}/settlement_action.php when that env var is set;
 * otherwise they respond 501 JSON.
 */
export async function GET(request) {
  const action = new URL(request.url).searchParams.get("action") || "";

  if (action === "get_emp_list") {
    try {
      const res = await apiGet("get_emp_list");
      if (res.error) {
        return NextResponse.json({ success: false, message: res.error }, { status: 502 });
      }
      return NextResponse.json(res.data ?? {}, { status: res.status || 200 });
    } catch {
      return NextResponse.json(
        { success: false, message: "Failed to load employee list." },
        { status: 500 }
      );
    }
  }

  return proxyLegacy(request, "settlement_action.php");
}

export async function POST(request) {
  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const res = await proxyLegacy(request, "settlement_action.php");

  const session = getSession();
  if (session) {
    const result = await res
      .clone()
      .json()
      .catch(() => null);
    const success = res.status >= 200 && res.status < 300 && result?.success !== false;
    logActivity({
      session,
      action: "settlement_action",
      category: "settlement",
      entity: body?.lead_id ? { type: "lead", id: body.lead_id } : null,
      meta: { action: body?.action },
      success,
    });
  }

  return res;
}
