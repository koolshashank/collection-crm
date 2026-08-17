/**
 * lib/loginAlert.js — emails the configured recipients whenever a login
 * attempt fails (wrong password, wrong 2FA code, or a disallowed role),
 * so someone trying another person's account is flagged right away. The
 * full history of these attempts also lives in the audit log (lib/auditLog.js).
 */

import { readLoginAlertConfig } from "./loginAlertConfig";
import { sendMail } from "./mail";

const REASON_LABELS = {
  invalid_credentials: "Wrong email or password",
  invalid_2fa_code: "Wrong two-factor code",
  unauthorized_role: "Account role not allowed to log in",
};

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Fire-and-forget from the caller's perspective: never throws. */
export async function sendLoginAlertEmail({ attemptedUsername, ip, userAgent, reason }) {
  try {
    const { enabled, recipients, sender } = readLoginAlertConfig();
    if (!enabled || recipients.length === 0) return;

    const when = new Date().toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const reasonLabel = REASON_LABELS[reason] || reason || "Unknown";
    const account = attemptedUsername || "—";

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12)">
  <div style="background:#1b2a4a;padding:16px 24px;color:#fff;font-size:15px;font-weight:700">&#9888; Failed Login Attempt Detected</div>
  <div style="padding:24px">
    <table style="width:100%;font-size:13px;color:#222;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#666;width:140px">Attempted account</td><td style="padding:6px 0;font-weight:700">${esc(account)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Reason</td><td style="padding:6px 0">${esc(reasonLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">IP address</td><td style="padding:6px 0">${esc(ip || "—")}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Device / browser</td><td style="padding:6px 0">${esc(userAgent || "—")}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Time</td><td style="padding:6px 0">${esc(when)}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#888">Full history is available in the CRM under Audit Log (auth category).</p>
  </div>
</div>
</body></html>`;

    const text = `Failed login attempt\nAccount: ${account}\nReason: ${reasonLabel}\nIP: ${ip || "—"}\nDevice: ${userAgent || "—"}\nTime: ${when}`;

    const result = await sendMail({
      to: recipients,
      subject: `Security Alert: Failed login attempt on "${account}"`,
      html,
      text,
      fromAddress: sender,
    });
    if (!result.sent) {
      console.error("sendLoginAlertEmail: SMTP send failed:", result.error);
    } else {
      console.log(`sendLoginAlertEmail: alert sent to ${recipients.join(", ")} for "${account}" (${reason})`);
    }
  } catch (err) {
    console.error("sendLoginAlertEmail failed:", err);
  }
}
