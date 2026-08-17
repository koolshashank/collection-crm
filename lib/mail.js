/**
 * lib/mail.js — shared SMTP mailer for the login-alert feature.
 * Reuses the same SMTP account as NOC emails (NOC_SMTP_* env vars,
 * app/api/noc/email/route.js) — confirmed delivering to @blinkrloan.com
 * mailboxes. NOC's own inline transporter is untouched and keeps sending
 * as noc@blinkrloan.com; the sender address here is passed in per call so
 * the login-alert admin can configure a different "From" in Settings.
 */

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.NOC_SMTP_HOST || "smtp.netcorecloud.net";
const SMTP_PORT = parseInt(process.env.NOC_SMTP_PORT || "587", 10);
const SMTP_USER = process.env.NOC_SMTP_USER || "blinkrloan_eapi";
const SMTP_PASS = process.env.NOC_SMTP_PASS || "f2b#69f239b3c";
const SMTP_SECURE = process.env.NOC_SMTP_SECURE || "tls";
const DEFAULT_FROM = process.env.NOC_MAIL_FROM || "noc@blinkrloan.com";
const DEFAULT_FROM_NAME = process.env.NOC_MAIL_FROM_NAME || "Blinkr Loan Pvt. Ltd.";

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE === "ssl",
      requireTLS: SMTP_SECURE === "tls",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

/** Sends one email. Never throws — returns { sent, error } instead. */
export async function sendMail({ to, subject, html, text, fromAddress, fromName }) {
  try {
    await getTransporter().sendMail({
      from: { name: fromName || DEFAULT_FROM_NAME, address: fromAddress || DEFAULT_FROM },
      to,
      subject,
      html,
      text,
    });
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: err?.message || "SMTP send failed" };
  }
}
