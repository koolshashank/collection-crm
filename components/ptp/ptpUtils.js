/**
 * Helpers for the PTP module — mirrors ptp_details.php helpers exactly.
 */

/** ptp_fmt_inr(): ₹ with Cr / L abbreviation, same thresholds as PHP. */
export function fmtInr(value) {
  const n = Number(value) || 0;
  if (n >= 1e7)
    return "₹" + (n / 1e7).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Cr";
  if (n >= 1e5)
    return "₹" + (n / 1e5).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/**
 * ptp_derive_status(): trust the API's own classification (ptp_outcome)
 * first, then fall back to a purely date-based guess — identical to PHP.
 */
export function deriveStatus(ptpDate, apiOutcome = null) {
  if (apiOutcome) return apiOutcome;
  if (!ptpDate) return "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const parsed = new Date(ptpDate);
  if (isNaN(parsed.getTime())) return "unknown";
  const d = parsed.toISOString().slice(0, 10);
  if (d === today) return "today";
  if (d < today) return "overdue";
  return "upcoming";
}

/** ptp_status_meta(): same labels + hex colors as PHP. */
export function statusMeta(status) {
  switch (status) {
    case "upcoming":
      return { label: "Upcoming", color: "#1a6fa8", bg: "#e8f4fd", border: "#a8d4ef" };
    case "today":
      return { label: "Due Today", color: "#b7770d", bg: "#fef3dc", border: "#f9dfa0" };
    case "overdue":
      return { label: "Overdue", color: "#C0392B", bg: "#fdecea", border: "#f5c6c6" };
    case "broken":
      return { label: "Broken", color: "#C0392B", bg: "#fdecea", border: "#f5c6c6" };
    case "kept":
      return { label: "Kept", color: "#1E7E5E", bg: "#e8f5f0", border: "#a8ddd0" };
    default:
      return { label: "Unknown", color: "#5A6A7A", bg: "#f0f2f5", border: "#d0d8e0" };
  }
}

/** Type pill colors — full / partial / settle (same hex values). */
export function typeMeta(type) {
  if (type === "partial") return { bg: "#fef3dc", color: "#b7770d" };
  if (type === "settle") return { bg: "#f3e8fd", color: "#9b59b6" };
  return { bg: "#e8f5f0", color: "#1E7E5E" };
}

export function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const STATUS_TABS = {
  all: "All",
  upcoming: "Upcoming",
  today: "Due Today",
  overdue: "Overdue",
  broken: "Broken",
};

export const PRIVILEGED_ROLES = ["ADMIN", "COLLECTION-HEAD", "RECOVERY_HEAD", "COLLECTION-EXECUTIVE", "ACM"];
