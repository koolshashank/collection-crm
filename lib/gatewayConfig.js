/**
 * lib/gatewayConfig.js — payment gateway active/inactive state.
 * Mirrors the read half of gateway_config.php: config is stored in
 * PROJECT_ROOT/data/gateway_config.json (same shape as the PHP
 * gateway_config.json: { "payu": true, "paytm": true }).
 */

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "gateway_config.json");

/** Default config if file doesn't exist yet — same as PHP $defaults. */
export const GATEWAY_DEFAULTS = { payu: true, paytm: true };

/** Reads the current gateway config, falling back to defaults. */
export function readGatewayConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...GATEWAY_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...GATEWAY_DEFAULTS };
}

/** Writes the gateway config. Returns true on success. */
export function writeGatewayConfig(body) {
  const cfg = {
    payu: Boolean(body?.payu ?? true),
    paytm: Boolean(body?.paytm ?? true),
  };
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
