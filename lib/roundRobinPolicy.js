/**
 * lib/roundRobinPolicy.js — global "is the Round Robin Distribution card on
 * the Assign Leads page turned on" switch. Same flat-JSON pattern as
 * lib/smartPrioritizationPolicy.js / lib/twoFactorPolicy.js.
 * Defaults to enabled — the feature already works for everyone today, so
 * an admin has to explicitly opt OUT rather than everyone losing it until
 * someone opts in.
 */

import fs from "fs";
import path from "path";

const POLICY_FILE = path.join(process.cwd(), "data", "round_robin_policy.json");

export const ROUND_ROBIN_DEFAULTS = { enabled: true };

export function readRoundRobinPolicy() {
  try {
    if (fs.existsSync(POLICY_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(POLICY_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...ROUND_ROBIN_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...ROUND_ROBIN_DEFAULTS };
}

export function writeRoundRobinPolicy(body) {
  const cfg = { enabled: Boolean(body?.enabled ?? true) };
  try {
    fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
    fs.writeFileSync(POLICY_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
