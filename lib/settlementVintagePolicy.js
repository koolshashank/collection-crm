/**
 * lib/settlementVintagePolicy.js — admin-editable "vintage % of outstanding"
 * table used to suggest a settlement amount when a request is raised. Same
 * flat-JSON read/write pattern as lib/roundRobinPolicy.js.
 */

import fs from "fs";
import path from "path";
import { SETTLEMENT_VINTAGE_BUCKET_KEYS, SETTLEMENT_VINTAGE_DEFAULTS } from "@/lib/settlementVintage";

const POLICY_FILE = path.join(process.cwd(), "data", "settlement_vintage_policy.json");

export function readSettlementVintagePolicy() {
  try {
    if (fs.existsSync(POLICY_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(POLICY_FILE, "utf8"));
      if (cfg && typeof cfg === "object") {
        return {
          ...SETTLEMENT_VINTAGE_DEFAULTS,
          ...cfg,
          percents: { ...SETTLEMENT_VINTAGE_DEFAULTS.percents, ...(cfg.percents || {}) },
        };
      }
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...SETTLEMENT_VINTAGE_DEFAULTS, percents: { ...SETTLEMENT_VINTAGE_DEFAULTS.percents } };
}

export function writeSettlementVintagePolicy(body) {
  const percents = {};
  for (const key of SETTLEMENT_VINTAGE_BUCKET_KEYS) {
    const num = Number(body?.percents?.[key]);
    percents[key] = Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : SETTLEMENT_VINTAGE_DEFAULTS.percents[key];
  }
  const cfg = {
    enabled: Boolean(body?.enabled ?? true),
    percents,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
    fs.writeFileSync(POLICY_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
