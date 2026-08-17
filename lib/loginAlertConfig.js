/**
 * lib/loginAlertConfig.js — admin-managed list of email addresses notified
 * whenever a login attempt fails (wrong password, wrong 2FA code, or a
 * disallowed role). Mirrors lib/twoFactorPolicy.js's flat-JSON idiom:
 * config lives in data/login_alert_config.json.
 */

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "login_alert_config.json");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const LOGIN_ALERT_DEFAULTS = { enabled: true, recipients: [], sender: "info@blinkrloan.com" };

export function readLoginAlertConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && typeof cfg === "object") {
        return {
          enabled: Boolean(cfg.enabled ?? LOGIN_ALERT_DEFAULTS.enabled),
          recipients: Array.isArray(cfg.recipients) ? cfg.recipients : [],
          sender: EMAIL_RE.test(cfg.sender) ? cfg.sender : LOGIN_ALERT_DEFAULTS.sender,
        };
      }
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...LOGIN_ALERT_DEFAULTS };
}

export function writeLoginAlertConfig(body) {
  const recipients = Array.isArray(body?.recipients)
    ? [...new Set(body.recipients.map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))]
    : [];
  const sender = EMAIL_RE.test(String(body?.sender ?? "").trim())
    ? String(body.sender).trim().toLowerCase()
    : LOGIN_ALERT_DEFAULTS.sender;
  const cfg = { enabled: Boolean(body?.enabled ?? LOGIN_ALERT_DEFAULTS.enabled), recipients, sender };
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
