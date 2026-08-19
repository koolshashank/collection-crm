import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/session";
import { readEmailConfig } from "@/lib/emailConfig";

export const dynamic = "force-dynamic";

/**
 * POST /api/config/email/test — sends a test email using the SMTP config
 * currently in the Settings form (which may have unsaved edits), so an
 * admin can verify new credentials work before hitting Save Changes.
 * Body: { to, draft: { host, port, user, pass?, secure, fromAddress, fromName, replyTo } }
 *   `draft.pass` blank/omitted → use the already-saved password.
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const to = String(body.to || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ success: false, message: "Enter a valid email address to send the test to." }, { status: 400 });
  }

  const saved = readEmailConfig();
  const draft = body.draft || {};
  const cfg = {
    host: draft.host || saved.host,
    port: parseInt(draft.port, 10) || saved.port,
    user: draft.user || saved.user,
    pass: draft.pass || saved.pass, // blank draft password → keep the saved one
    secure: draft.secure === "ssl" ? "ssl" : "tls",
    fromAddress: draft.fromAddress || saved.fromAddress,
    fromName: draft.fromName || saved.fromName,
  };

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure === "ssl",
      requireTLS: cfg.secure === "tls",
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: { name: cfg.fromName, address: cfg.fromAddress },
      to,
      subject: "BlinkR Loan CRM — Test Email",
      text: `This is a test email from the CRM's Email Configure settings, sent via ${cfg.host}:${cfg.port}. If you received this, the SMTP configuration is working.`,
      html: `<p>This is a test email from the CRM's <strong>Email Configure</strong> settings, sent via <code>${cfg.host}:${cfg.port}</code>.</p><p>If you received this, the SMTP configuration is working.</p>`,
    });

    return NextResponse.json({ success: true, message: "Test email sent to " + to });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Test email failed: " + (err?.message || "unknown SMTP error") },
      { status: 502 }
    );
  }
}
