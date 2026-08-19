/**
 * lib/emailConfig.js — the single, admin-editable SMTP configuration every
 * outbound email in this app should use (NOC, Settlement Letter, NDC,
 * login alerts' "sender" stays separately configurable in its own
 * section). Replaces the hardcoded NOC_SMTP_* fallback constants that used
 * to be duplicated in lib/mail.js and app/api/noc/email/route.js — change
 * the password here once, and every email path picks it up immediately,
 * no redeploy needed.
 */

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "email_config.json");

/* Same values that used to be hardcoded as the NOC_SMTP_* fallbacks —
   kept as defaults so behavior doesn't change until an admin edits them. */
export const EMAIL_CONFIG_DEFAULTS = {
  host: "smtp.netcorecloud.net",
  port: 587,
  user: "blinkrloan_eapi",
  pass: "f2b#69f239b3c",
  secure: "tls", // "tls" (STARTTLS) | "ssl"
  fromAddress: "noc@blinkrloan.com",
  fromName: "Blinkr Loan Pvt. Ltd.",
  replyTo: "support@blinkrloan.com",
  updatedAt: null,
};

/** Full config, including the real password — server-side use only. */
export function readEmailConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...EMAIL_CONFIG_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — fall back to defaults */
  }
  return { ...EMAIL_CONFIG_DEFAULTS };
}

/** Same config with the password stripped out — safe to send to the browser. */
export function readEmailConfigSafe() {
  const { pass, ...rest } = readEmailConfig();
  return { ...rest, hasPassword: Boolean(pass) };
}

/**
 * Writes the config. A blank/omitted `pass` means "leave the current
 * password alone" — the Settings form never round-trips the real password
 * back to the browser, so this is how an admin can edit everything else
 * without accidentally blanking out a working password.
 */
export function writeEmailConfig(body) {
  const current = readEmailConfig();
  const cfg = {
    host: String(body?.host || current.host).trim().slice(0, 200),
    port: parseInt(body?.port, 10) || current.port || 587,
    user: String(body?.user || current.user).trim().slice(0, 200),
    pass: body?.pass ? String(body.pass).slice(0, 200) : current.pass,
    secure: body?.secure === "ssl" ? "ssl" : "tls",
    fromAddress: String(body?.fromAddress || current.fromAddress).trim().slice(0, 200),
    fromName: String(body?.fromName || current.fromName).trim().slice(0, 200),
    replyTo: String(body?.replyTo || current.replyTo).trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}
