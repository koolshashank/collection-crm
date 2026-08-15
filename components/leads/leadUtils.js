"use client";

/* ── Roles & access flags (verbatim from lead.php) ─────────────────────── */
export const PRIVILEGED_ROLES = [
  "ADMIN",
  "COLLECTION-HEAD",
  "RECOVERY_HEAD",
  "COLLECTION-EXECUTIVE",
  "ACM",
];
export function isPrivilegedUser(roles = []) {
  return PRIVILEGED_ROLES.some((r) => roles.includes(r));
}

/* ── Sort params (verbatim map from lead.php) ──────────────────────────── */
export const SORTABLE_COLUMNS = {
  name: "full_name",
  loan_id: "loan_id",
  mobile: "mobile",
  sanction_amount: "sanction_amount",
  disbursal_date: "disbursal_date_ist",
  repayment_amount: "repayment_amount",
  repayment_date: "repayment_date_ist",
  city: "city",
  state: "state",
  pincode: "pincode",
  status: "payment_status",
  // Smart Prioritization (Settings toggle) — synthetic zero-padded score
  // string injected client-side onto each row when the feature is on.
  priority_score: "__priority_sort",
};

/* Client-side sort — same semantics as the PHP usort (lowercase string compare) */
export function sortLoanList(list, sort, order) {
  const key = SORTABLE_COLUMNS[sort];
  if (!key) return list;
  const sorted = [...list].sort((a, b) => {
    const va = String(a?.[key] ?? "").toLowerCase();
    const vb = String(b?.[key] ?? "").toLowerCase();
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return order === "asc" ? cmp : -cmp;
  });
  return sorted;
}

/* ── Status meta (lp_status_meta) — same labels, design-system tones ───── */
export function statusMeta(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v.includes("not recovered"))
    return { label: "NR", cls: "bg-red-50 text-danger border-red-200" };
  if (v.includes("part"))
    return { label: "PP", cls: "bg-amber/10 text-amber border-amber/40" };
  if (v.includes("recovered"))
    return { label: "RC", cls: "bg-accent-light text-accent-dark border-accent/40" };
  if (v.includes("settled"))
    return { label: "Settled", cls: "bg-blue-50 text-info border-info/40" };
  const lbl = ucwords(v) || "Unknown";
  return { label: lbl, cls: "bg-gray-100 text-gray-500 border-line" };
}

export function ucwords(s) {
  return String(s || "").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/* ── Currency (lp_fmt_inr) ──────────────────────────────────────────────── */
export function fmtInr(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1e7) return "₹" + numFmt(v / 1e7, 2) + " Cr";
  if (v >= 1e5) return "₹" + numFmt(v / 1e5, 2) + " L";
  return "₹" + numFmt(v, 0);
}
export function numFmt(n, decimals = 0) {
  return (parseFloat(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* Loan-history style ("Rs." prefixed, same as lead.php lhInr) */
export function lhInr(n) {
  const v = parseFloat(n) || 0;
  if (v >= 10000000) return "Rs." + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "Rs." + (v / 100000).toFixed(2) + " L";
  return "Rs." + v.toLocaleString("en-IN");
}

/* Call-modal style ("Rs " prefixed, same as lead.php inr()) */
export function callInr(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1e5) return "Rs " + (v / 1e5).toFixed(2) + " L";
  return "Rs " + v.toLocaleString("en-IN");
}

/* ── Dates ──────────────────────────────────────────────────────────────── */
/* PHP date('Y-m-d', strtotime($d)) */
export function fmtYmd(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const p = (x) => String(x).padStart(2, "0");
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  } catch {
    return "";
  }
}
/* PHP date('d M Y', strtotime($d)) */
export function fmtDMonY(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}
/* Loan-history date (en-IN, "05 Aug 2025" / "--") */
export function lhFmtDate(d) {
  if (!d) return "--";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

/* ── DPD & bucket derivation (verbatim logic from lead.php row loop) ────── */
export function dpdBucketInfo(row) {
  const dpdRaw = row?.dpd ?? null;
  const dpdInt = dpdRaw !== null && dpdRaw !== undefined && dpdRaw !== "" ? parseInt(dpdRaw, 10) : null;

  let bucket = row?.dpd_bucket ?? null;
  if (!bucket && dpdInt !== null && !isNaN(dpdInt)) {
    if (dpdInt === 0) bucket = "No DPD";
    else if (dpdInt <= 30) bucket = "1-30 DPD";
    else if (dpdInt <= 60) bucket = "31-60 DPD";
    else if (dpdInt <= 90) bucket = "61-90 DPD";
    else if (dpdInt <= 180) bucket = "91-180 DPD";
    else bucket = "180+ DPD";
  } else if (bucket) {
    if (bucket.includes("0-30") && dpdInt === 0) bucket = "No DPD";
    else if (bucket.includes("0-30")) bucket = "1-30 DPD";
    else if (bucket.includes("31-60")) bucket = "31-60 DPD";
    else if (bucket.includes("61-90")) bucket = "61-90 DPD";
    else if (bucket.includes("91-180")) bucket = "91-180 DPD";
    else if (bucket.includes("180")) bucket = "180+ DPD";
  }

  let tone; // green / amber / red / muted — same thresholds as the PHP colors
  if (!bucket || dpdInt === null || isNaN(dpdInt)) tone = "muted";
  else if (dpdInt === 0) tone = "green";
  else if (dpdInt <= 60) tone = "amber";
  else tone = "red";

  return { dpdInt: dpdInt !== null && !isNaN(dpdInt) ? dpdInt : null, bucket, tone };
}

export const DPD_BUCKET_TONES = {
  green: "bg-accent-light text-accent-dark border-accent/40",
  amber: "bg-amber/10 text-amber border-amber/40",
  red: "bg-red-50 text-danger border-red-200",
  muted: "bg-gray-100 text-gray-400 border-line",
};

/* ── Query-string helpers (http_build_query / lp_pageUrl equivalents) ───── */
export function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  return usp.toString();
}

/* HTML-escape (esc / lhEsc / pfEsc / lpRmEsc equivalents) — React escapes by
   default, so this is only needed when building CSV/plain strings. */
export function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
