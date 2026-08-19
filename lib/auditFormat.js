/**
 * lib/auditFormat.js — shared display formatting for audit log entries.
 * Used by both the Audit Log page (client) and the CSV/XLSX export route
 * (server) so the two never drift apart.
 */

export const ACTION_LABELS = {
  login: "Logged in",
  login_failed: "Login failed",
  logout: "Logged out",
  password_changed: "Changed their password",
  payment_posted: "Posted a payment",
  ptp_submitted: "Submitted a PTP",
  settlement_action: "Settlement action",
  loan_correction_reopen: "Reopened a loan",
  loan_correction_delete_payment: "Deleted a payment (correction)",
  lead_assigned: "Assigned leads",
  lead_assigned_bulk: "Bulk-assigned leads",
  lead_assigned_round_robin: "Round-robin assigned leads",
  noc_generated: "Generated a NOC",
  noc_emailed: "Emailed a NOC",
  settings_changed: "Changed a setting",
  team_updated: "Updated a team",
  team_deleted: "Deleted a team",
  customer_viewed: "Viewed a customer profile",
  loan_history_viewed: "Viewed loan history",
  document_viewed: "Viewed a document",
  whatsapp_sent: "Sent a WhatsApp message",
  whatsapp_sent_freeform: "Sent a WhatsApp message",
  pan_blocked: "Blocked a PAN",
  reloan_enabled: "Enabled reloan",
  remark_added: "Added a remark",
  payment_link_generated: "Generated a payment link",
  cibil_step_run: "Ran a CIBIL pipeline step",
  copy_details: "Copied a customer's loan summary",
  print_page: "Printed a customer's page",
  screenshot_captured: "Downloaded a screenshot of loan attributes",
  two_factor_reset: "Reset a user's 2FA",
  token_copied: "Copied their login/API token",
  payment_link_copied: "Copied a payment link",
  collection_export: "Exported the Collection Report",
  audit_export: "Exported the Audit Log",
};

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

/* Icon + color per category — a small fixed set, so colors are assigned
   explicitly in order rather than hashed (same rule as disposition codes). */
export const CATEGORY_META = {
  auth: { icon: "lock", color: "#2563a8" },
  payments: { icon: "rupee", color: "#0c7a70" },
  ptp: { icon: "cal", color: "#7c3aed" },
  settlement: { icon: "waiver", color: "#b83280" },
  loan_correction: { icon: "doc", color: "#c0392b" },
  assignment: { icon: "users", color: "#0c7a70" },
  noc: { icon: "doc", color: "#2563a8" },
  settings: { icon: "link", color: "#6b7280" },
  teams: { icon: "users", color: "#7c3aed" },
  employees: { icon: "user", color: "#2563a8" },
  view: { icon: "eye", color: "#3b6ea5" },
  whatsapp: { icon: "whatsapp", color: "#1E7E5E" },
  cibil: { icon: "zap", color: "#e8a33d" },
  security: { icon: "shield", color: "#c0392b" },
  other: { icon: "doc", color: "#6b7280" },
};

export function categoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.other;
}

/** Tone for the "Related To" badge, keyed by entity type. */
export const ENTITY_TONES = {
  lead: { bg: "#f3e8fd", text: "#6d28d9" },
  loan: { bg: "#f3e8fd", text: "#6d28d9" },
  customer: { bg: "#e6f6f4", text: "#0c7a70" },
  team: { bg: "#eef6fd", text: "#2563a8" },
  employee: { bg: "#fdf6e9", text: "#8a5a12" },
};

export function entityTone(type) {
  return ENTITY_TONES[type] || { bg: "#eef1f5", text: "#4b5563" };
}

export function metaSummary(entry) {
  const parts = [];
  if (entry.entity?.id) parts.push(`${entry.entity.type || "id"}: ${entry.entity.id}`);
  const meta = entry.meta || {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${k}: ${Array.isArray(v) ? v.join(",") : v}`);
  }
  return parts.join(" · ") || "—";
}

export function fmtAuditTs(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts ?? "");
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const CATEGORY_OPTIONS = [
  "auth", "payments", "ptp", "settlement", "loan_correction", "assignment",
  "noc", "settings", "teams", "employees", "view", "whatsapp", "cibil", "security", "other",
];
