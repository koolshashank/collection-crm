/**
 * Pure helpers mirroring collection.php's PHP functions
 * (co_inr, co_date, co_initials, co_type, date defaults).
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function nf(n, d = 0) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* PHP co_inr() — note: no K tier on this page */
export function coInr(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return "₹" + nf(n / 1e7, 2) + " Cr";
  if (n >= 1e5) return "₹" + nf(n / 1e5, 2) + " L";
  return "₹" + nf(n, 0);
}

/* PHP co_date() — d M Y */
export function coDate(v) {
  if (!v) return "--";
  const t = new Date(v);
  if (isNaN(t.getTime())) return "--";
  return `${String(t.getDate()).padStart(2, "0")} ${MONTHS_SHORT[t.getMonth()]} ${t.getFullYear()}`;
}

/* PHP co_initials() */
export function coInitials(name) {
  const parts = String(name || "").trim().split(" ");
  return ((parts[0] || "U").charAt(0) + (parts[1] || "").charAt(0)).toUpperCase();
}

/* PHP co_type(): determine which bucket is non-zero */
export function coType(lead) {
  if (Number(lead?.ontime_collection ?? 0) > 0) return "ontime";
  if (Number(lead?.pre_collection ?? 0) > 0) return "pre";
  if (Number(lead?.post_collection ?? 0) > 0) return "post";
  return "none";
}

export function numberFormat(v) {
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return isoDate(new Date());
}

export function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}
