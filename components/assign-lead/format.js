/**
 * Shared helpers for the Assign Lead module — mirrors assign_lead.php helpers.
 */

/** al_fmt_inr(): ₹ with Cr / L abbreviation, same thresholds as PHP. */
export function fmtInr(value) {
  const n = Number(value) || 0;
  if (n >= 1e7)
    return "₹" + (n / 1e7).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Cr";
  if (n >= 1e5)
    return "₹" + (n / 1e5).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Employee field fallbacks — identical order to the PHP page. */
export function empId(emp) {
  return emp?.emp_id ?? emp?.id ?? emp?.employee_id ?? emp?.user_id ?? "";
}

export function empName(emp) {
  const name = emp?.emp_name || `${emp?.f_name ?? ""} ${emp?.l_name ?? ""}`;
  return String(name).trim();
}

export function empDesignation(emp) {
  return emp?.designation ?? emp?.role ?? "";
}

/** Option label: "Name — Designation" (same as PHP <option> text). */
export function empOptionLabel(emp) {
  const des = empDesignation(emp);
  return empName(emp) + (des ? " — " + des : "");
}

/** Numeric API key for a lead row — identical fallback chain to PHP. */
export function leadKey(row) {
  return row?.lead_id ?? row?.id ?? row?.leadId ?? row?.loan_id ?? "";
}

/** Normalise the employee list container — data/result/employees/list. */
export function extractEmpList(body) {
  const list = body?.data ?? body?.result ?? body?.employees ?? body?.list ?? [];
  return Array.isArray(list) ? list : [];
}
