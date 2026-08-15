"use client";

/**
 * Port of the PHP helpers + status logic at the top of client_info.php.
 * Logic is 1:1 — only rendering differs.
 */

export function ciSafe(v, def = "N/A") {
  return v !== null && v !== undefined && v !== "" ? String(v) : def;
}

/** ci_date — 'd M Y', '--' when empty */
export function ciDate(v, def = "--") {
  if (!v) return def;
  const d = new Date(v);
  if (isNaN(d.getTime())) return def;
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${mon} ${d.getFullYear()}`;
}

/** ci_inr — ₹ + whole rupees */
export function ciInr(v) {
  const n = Number(v) || 0;
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

/** ci_initials */
export function ciInitials(n) {
  const p = String(n || "").trim().split(" ");
  return (((p[0] || "")[0] || "") + ((p[1] || "")[0] || "")).toUpperCase();
}

/* ── STATUS LOGIC (verbatim from PHP) ── */
export function getStatusMeta(loanStatusRaw) {
  const loanStatus = String(loanStatusRaw || "").trim().toLowerCase();
  if (loanStatus === "closed") return { label: "CLOSED", color: "#1E7E5E", bg: "#e8f5f0" };
  if (loanStatus === "settled") return { label: "SETTLED", color: "#3b6ea5", bg: "#e8f4fd" };
  if (loanStatus === "part payment") return { label: "PART PAYMENT", color: "#e8a33d", bg: "#fdf3e3" };
  return { label: "NOT CLOSED", color: "#d64545", bg: "#fbeaea" };
}

export function getRepaymentBadge(repaymentStatusType) {
  switch (Number(repaymentStatusType)) {
    case 0: return { msg: "Salary Date equals Repayment Date", color: "#6c757d" };
    case 1: return { msg: "Threshold Applied · Salary After Repayment", color: "#d64545" };
    case 2: return { msg: "No Threshold · Salary After Repayment", color: "#e8a33d" };
    case 3: return { msg: "Threshold Applied · Salary Before Repayment", color: "#1E7E5E" };
    case 4: return { msg: "No Threshold · Salary Before Repayment", color: "#3b6ea5" };
    default: return null;
  }
}

/* ── DPD priority (verbatim thresholds) ── */
export function getPriority(dpdNum) {
  if (dpdNum > 90) return { label: "Critical", color: "#d64545", bg: "#fbeaea" };
  if (dpdNum > 60) return { label: "High", color: "#e67e22", bg: "#fef0e0" };
  if (dpdNum > 30) return { label: "Medium", color: "#e8a33d", bg: "#fdf3e3" };
  return { label: "Normal", color: "#1E7E5E", bg: "#e8f5f0" };
}

/** DPD health strip — 10 segments, filled proportionally to severity */
export const DPD_SEGS = 10;
export function dpdFilledSegs(dpdNum) {
  return dpdNum === 0 ? 0 : Math.min(DPD_SEGS, Math.max(1, Math.floor(dpdNum / 18) + 1));
}

/** Role flags — copied verbatim from client_info.php */
export function getRoleFlags(roles = []) {
  return {
    isAdmin: roles.includes("ADMIN"),
    isHead: roles.includes("COLLECTION-HEAD"),
    isExec: roles.includes("COLLECTION-EXECUTIVE"),
    isRHead: roles.includes("RECOVERY_HEAD"),
    isVisitor: roles.includes("VISITOR"),
    isAcm: roles.includes("ACM"),
    isAccounts: roles.includes("ACCOUNTS"),
  };
}

/** Copy-summary text block — same lines as the hidden #ci-copy-text textarea */
export function buildCopyText(loan) {
  const l = loan || {};
  return (
    "Loan No       : " + (l.loan_no ?? "") + "\n" +
    "Name          : " + (l.full_name ?? "") + "\n" +
    "Phone         : " + (l.mobile ?? "") + "\n" +
    "Repayment Amt : " + ciInr(l.repayment_amount ?? 0) + "\n" +
    "Repayment Date: " + ciDate(l.repayment_date) + "\n" +
    "Overdue Days  : " + (l.dpd ?? "") + "\n" +
    "Overdue Amount: " + ciInr(l.overdue_amount ?? 0) + "\n" +
    "Pay Today     : " + (l.ontime_repayment_amount ?? "") + "\n" +
    "Email         : " + (l.personal_email ?? "") + "\n" +
    "Office Email  : " + (l.office_email ?? "") + "\n" +
    "Status        : " + (l.loan_status ?? "") + "\n" +
    "Address        : " + (l.address ?? "") + "\n"
  );
}
