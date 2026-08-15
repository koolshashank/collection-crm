/**
 * Sidebar menu — mirror of header.php.
 * `roles: null` = visible to everyone; otherwise user needs at least one listed role.
 * `menuKey` matches the old data-menu-key so the localStorage
 * "crm_menu_config" (menu manager) keeps working unchanged.
 */

/** Canonical role list — keep in sync with ALLOWED_ROLES in app/api/auth/login/route.js. */
export const ALL_ROLES = [
  "ADMIN",
  "COLLECTION-HEAD",
  "COLLECTION-EXECUTIVE",
  "VISITOR",
  "ACCOUNTS",
  "RECOVERY_HEAD",
  "ACM",
];

export const MENU_SECTIONS = [
  {
    label: "Main",
    items: [
      { menuKey: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: null },
      { menuKey: "portfolio", label: "Portfolio", href: "/leads", icon: "users", roles: null },
      { menuKey: "assign_lead", label: "Assign Lead", href: "/assign-lead", icon: "user-plus", roles: ["ADMIN", "COLLECTION-HEAD", "ACM"] },
      { menuKey: "collection", label: "Collections", href: "/collection", icon: "folder", roles: ["ADMIN", "COLLECTION-HEAD", "ACM"] },
      { menuKey: "payments", label: "Payments", href: "/payments", icon: "credit-card", roles: ["ADMIN"] },
      { menuKey: "payment_status", label: "Payment Status", href: "/payment-status", icon: "card-check", roles: ["ADMIN"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { menuKey: "ptp", label: "Promise to Pay", href: "/ptp", icon: "calendar", roles: ["ADMIN", "COLLECTION-HEAD", "COLLECTION-EXECUTIVE", "ACM"] },
      { menuKey: "disposition", label: "Disposition", href: "/disposition", icon: "check-circle", roles: ["ADMIN", "COLLECTION-HEAD", "COLLECTION-EXECUTIVE", "ACM"] },
      { menuKey: "performance", label: "Performance Report", href: "/performance-report", icon: "bar-chart", roles: ["ADMIN", "COLLECTION-HEAD", "COLLECTION-EXECUTIVE"] },
      { menuKey: "performance", label: "Team Performance", href: "/team-performance", icon: "team", roles: ["ADMIN", "COLLECTION-HEAD"] },
      { menuKey: "team_mapping", label: "Team Mapping", href: "/team-mapping", icon: "sliders", roles: ["ADMIN", "COLLECTION-HEAD"] },
      { menuKey: "field_visit", label: "Field Visit", href: "/field-visit", icon: "map-pin", roles: ["ADMIN", "COLLECTION-HEAD"] },
      { menuKey: "field_tracking", label: "Field Visit Tracking", href: "/field-tracking", icon: "map-route", roles: ["ADMIN", "COLLECTION-HEAD"] },
    ],
  },
  {
    label: "Reports",
    items: [
      { menuKey: "reports", label: "Reports", href: "/reports", icon: "file-text", roles: ["ADMIN"] },
      { menuKey: "reports", label: "AUM Report", href: "/aum-report", icon: "file-text", roles: ["ADMIN"] },
      { menuKey: "aum_comprehensive", label: "AUM Comprehensive", href: "/aum-comprehensive", icon: "file-text", roles: ["ADMIN"] },
      { menuKey: "bucket_ageing", label: "Bucket Ageing", href: "/bucket-ageing", icon: "layers", roles: ["ADMIN"] },
      { menuKey: "vintage_analysis", label: "Vintage Analysis", href: "/vintage-analysis", icon: "bar-chart", roles: ["ADMIN"] },
      { menuKey: "bsa_details", label: "BSA Details", href: "/bsa-report", icon: "file-text", roles: null },
      { menuKey: "call_reports", label: "Call Reports", href: "/call-reports", icon: "phone-call", roles: ["ADMIN", "COLLECTION-HEAD", "ACM"] },
      { menuKey: "cibil_report", label: "CIBIL Report", href: "/cibil-report", icon: "shield-check", roles: ["ADMIN"] },
    ],
  },
  {
    label: "Communication",
    items: [
      { menuKey: "communication", label: "Communication Hub", href: "/communication", icon: "message", roles: ["ADMIN"] },
    ],
  },
  {
    label: "Approval",
    items: [
      { menuKey: "settlement_approval", label: "Settlement Approval", href: "/settlement-approval", icon: "check-circle", roles: ["ADMIN", "COLLECTION-HEAD", "RECOVERY_HEAD"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { menuKey: "holiday_calendar", label: "Holiday Calendar", href: "/holiday-calendar", icon: "calendar", roles: ["ADMIN"] },
      { menuKey: "settings", label: "Settings", href: "/settings", icon: "settings", roles: ["ADMIN"] },
      { menuKey: "audit_log", label: "Audit Log", href: "/audit", icon: "file-text", roles: ["ADMIN"] },
      { menuKey: "noc", label: "NOC", href: "/noc", icon: "shield-check", roles: ["ADMIN", "ACM", "COLLECTION-HEAD"] },
      { menuKey: "settlement", label: "Settlement", href: "/settlement", icon: "hand-coins", roles: ["ADMIN", "COLLECTION-HEAD", "COLLECTION-EXECUTIVE"] },
      { menuKey: "legal_notice", label: "Legal Notice", href: "/legal-notice", icon: "scale", roles: ["ADMIN"] },
      { menuKey: "mail", label: "Mail", href: "/mail", icon: "mail", roles: ["ADMIN"] },
      { menuKey: "add_employee", label: "Create User", href: "/add-employee", icon: "user-plus", roles: ["ADMIN"] },
      { menuKey: "upload_festival", label: "Festival Media", href: "/upload-festival", icon: "image", roles: ["ADMIN"] },
      { menuKey: "menu_manager", label: "Role Permissions", href: "/role-permissions", icon: "sliders", roles: ["ADMIN"] },
    ],
  },
];

/**
 * `rolePermissions` — saved overrides from the Role Permissions page,
 * shape { [href]: { [role]: true|false } }. If an item has no saved
 * overrides at all, behavior is unchanged (item.roles === null → everyone,
 * regardless of userRoles). Once an item has been customized, each of the
 * user's roles is resolved individually — an explicit override wins,
 * otherwise falls back to the item's default `roles` list — and the item
 * is visible if ANY of the user's roles resolves to true.
 */
function roleOkForItem(item, userRoles, rolePermissions) {
  const overrides = rolePermissions?.[item.href];
  if (!overrides) return !item.roles || item.roles.some((r) => userRoles.includes(r));
  return userRoles.some((r) => {
    const explicit = overrides[r];
    return typeof explicit === "boolean" ? explicit : !item.roles || item.roles.includes(r);
  });
}

export function visibleSections(userRoles = [], menuConfig = {}, rolePermissions = {}) {
  return MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const roleOk = roleOkForItem(item, userRoles, rolePermissions);
      const cfg = menuConfig?.[item.menuKey];
      const cfgOk = !cfg || cfg.visible !== false;
      return roleOk && cfgOk;
    }),
  })).filter((s) => s.items.length > 0);
}
