import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees/list — normalized "all employees" list for the Team
 * Mapping page. Wraps the same backend call as app/api/ptp/emp-list/route.js
 * (get_emp_list), but resolves the field-name variance seen across the
 * existing ad hoc call sites (emp_id/id/employee_id, emp_name/f_name+l_name,
 * designation/role/emp_type) into one clean shape: { id, name, designation }[].
 */
function pickId(e) {
  return e.emp_id ?? e.id ?? e.employee_id ?? e.user_id ?? null;
}

function pickName(e) {
  const direct = e.emp_name ?? e.name;
  if (direct) return String(direct).trim();
  const first = e.f_name ?? e.first_name ?? "";
  const last = e.l_name ?? e.last_name ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || null;
}

function pickDesignation(e) {
  return e.designation ?? e.role ?? e.emp_type ?? e.position ?? e.user_role ?? null;
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const res = await apiGet("get_emp_list");
  if (!res.ok || res.data === null || typeof res.data !== "object") {
    return NextResponse.json(
      { success: false, message: res.error || `Employee list request failed (HTTP ${res.status})` },
      { status: 502 }
    );
  }

  const body = res.data;
  const rawList = body.data ?? body.result ?? body.employees ?? body.list ?? [];
  const employees = (Array.isArray(rawList) ? rawList : [])
    .map((e) => ({ id: pickId(e), name: pickName(e), designation: pickDesignation(e) }))
    .filter((e) => e.id !== null && e.id !== "" && e.name)
    .map((e) => ({ ...e, id: String(e.id) }));

  return NextResponse.json({ success: true, employees });
}
