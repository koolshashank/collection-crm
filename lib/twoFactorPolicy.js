/**
 * lib/twoFactorPolicy.js — global "is 2FA required to log in" switch.
 * Mirrors lib/gatewayConfig.js: flat JSON file at PROJECT_ROOT/data/two_factor_policy.json.
 * Admin-controlled; independent of any individual user's enrollment state.
 */

import fs from "fs";
import path from "path";

const POLICY_FILE = path.join(process.cwd(), "data", "two_factor_policy.json");

export const TWO_FACTOR_POLICY_DEFAULTS = { required: false };

export function readTwoFactorPolicy() {
  try {
    if (fs.existsSync(POLICY_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(POLICY_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...TWO_FACTOR_POLICY_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...TWO_FACTOR_POLICY_DEFAULTS };
}

export function writeTwoFactorPolicy(body) {
  const cfg = { required: Boolean(body?.required ?? false) };
  try {
    fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
    fs.writeFileSync(POLICY_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
