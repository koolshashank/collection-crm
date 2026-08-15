/**
 * lib/rolePermissions.js — per-role sidebar menu visibility overrides.
 * Mirrors lib/gatewayConfig.js: flat JSON file at PROJECT_ROOT/data/role_permissions.json.
 * Shape: { "<href>": { "<ROLE>": true|false, ... }, ... }
 * Keyed by href (not menuKey — two menuKey values are reused across
 * different links in components/nav/menuConfig.js, which would otherwise
 * toggle unrelated items together). Absent entries fall back to each
 * item's hardcoded default `roles` list.
 */

import fs from "fs";
import path from "path";

const PERMISSIONS_FILE = path.join(process.cwd(), "data", "role_permissions.json");

export function readRolePermissions() {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return cfg;
    }
  } catch {
    /* unreadable/corrupt — use empty (all defaults) */
  }
  return {};
}

export function writeRolePermissions(matrix) {
  const cfg = matrix && typeof matrix === "object" ? matrix : {};
  try {
    fs.mkdirSync(path.dirname(PERMISSIONS_FILE), { recursive: true });
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
