/**
 * lib/monthlyTargetStore.js — stores the admin-set monthly collection
 * target (overall / fresh / reloan), since there's no such concept on
 * the real backend — this is a business goal someone sets, not data the
 * API produces. Same local-JSON-file pattern as teamsStore.js.
 *
 * Amounts are stored in plain rupees. The UI lets admins type the number
 * in Crores (matches how targets are normally talked about) and converts
 * on save/display.
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "monthly_target_config.json");

const DEFAULTS = { total_target: 0, fresh_target: 0, reloan_target: 0, updated_at: null };

export function getMonthlyTarget() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveMonthlyTarget({ total_target, fresh_target, reloan_target }) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const value = {
    total_target: Number(total_target) || 0,
    fresh_target: Number(fresh_target) || 0,
    reloan_target: Number(reloan_target) || 0,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(FILE_PATH, JSON.stringify(value, null, 2));
  return value;
}
