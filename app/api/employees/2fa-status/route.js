import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";
import { getAllRecords } from "@/lib/twoFactorStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees/2fa-status — ADMIN only. Same normalized employee list
 * as /api/employees/list, with each entry's 2FA enrollment state joined in
 * from lib/twoFactorStore.js (enrolled = a TOTP secret has been generated).
 */
function isAdminUser(session) {
  return (session?.roles ?? []).includes("ADMIN");
}

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
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
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
  const records = getAllRecords();
  const employees = (Array.isArray(rawList) ? rawList : [])
    .map((e) => ({ id: pickId(e), name: pickName(e), designation: pickDesignation(e) }))
    .filter((e) => e.id !== null && e.id !== "" && e.name)
    .map((e) => {
      const rec = records[String(e.id)];
      return {
        ...e,
        id: String(e.id),
        twoFactorEnabled: Boolean(rec?.secret),
        activatedAt: rec?.secret ? rec.updatedAt ?? null : null,
      };
    });

  return NextResponse.json({ success: true, employees });
}
