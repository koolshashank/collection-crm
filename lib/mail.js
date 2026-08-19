/**
 * lib/mail.js — shared SMTP mailer for every outbound email in this app
 * except NOC's own inline transporter (app/api/noc/email/route.js), which
 * builds inline CID-embedded images and reads the same config directly.
 * SMTP host/port/user/password/from/reply-to all come from
 * lib/emailConfig.js (Settings → Communication → Email Configure) — no
 * transporter is cached, so a password change takes effect on the very
 * next send, no restart needed.
 */

import nodemailer from "nodemailer";
import { readEmailConfig } from "./emailConfig";

/** Sends one email. Never throws — returns { sent, error } instead. */
export async function sendMail({ to, subject, html, text, fromAddress, fromName, replyTo, attachments }) {
  try {
    const cfg = readEmailConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure === "ssl",
      requireTLS: cfg.secure === "tls",
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: { name: fromName || cfg.fromName, address: fromAddress || cfg.fromAddress },
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : cfg.replyTo ? { replyTo: { name: fromName || cfg.fromName, address: cfg.replyTo } } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: err?.message || "SMTP send failed" };
  }
}
