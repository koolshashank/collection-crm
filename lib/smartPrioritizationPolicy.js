/**
 * lib/smartPrioritizationPolicy.js — global "is the Smart Prioritization
 * feature turned on" switch. Same flat-JSON pattern as lib/twoFactorPolicy.js.
 */

import fs from "fs";
import path from "path";

const POLICY_FILE = path.join(process.cwd(), "data", "smart_prioritization_policy.json");

export const SMART_PRIORITIZATION_DEFAULTS = { enabled: false };

export function readSmartPrioritizationPolicy() {
  try {
    if (fs.existsSync(POLICY_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(POLICY_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...SMART_PRIORITIZATION_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...SMART_PRIORITIZATION_DEFAULTS };
}

export function writeSmartPrioritizationPolicy(body) {
  const cfg = { enabled: Boolean(body?.enabled ?? false) };
  try {
    fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
    fs.writeFileSync(POLICY_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
