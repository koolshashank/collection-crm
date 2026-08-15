export function fmtInr(n) {
  n = Number(n) || 0;
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + n.toLocaleString("en-IN");
}

export function fmtDate(s) {
  if (!s || s === "0000-00-00") return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export function fmtDateTime(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/);
  return ((parts[0] || "")[0] || (parts[1] || "")[0] || "?").toUpperCase();
}

export const STATUS_PILL_CLASS = {
  pending: "pillPending",
  approved: "pillApproved",
  rejected: "pillRejected",
};

export const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const AVATAR_CLASSES = ["avA", "avB", "avC"];

export function avatarClass(seed) {
  const n = Array.from(String(seed || "")).reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_CLASSES[n % AVATAR_CLASSES.length];
}
