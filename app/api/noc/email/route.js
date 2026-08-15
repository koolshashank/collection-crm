import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/session";
import { uploadToS3 } from "@/lib/s3";
import { saveNocLinkForCustomer } from "@/lib/noc/linkRecorder";
import { buildNocPdf, nocClean, nocImagePaths, phpDate_dSpMY, phpNumberFormat, todayYmd } from "@/lib/noc/pdf";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/noc/email — port of noc_email.php.
 * Generates the NOC PDF in-memory and emails it to the customer.
 * Returns JSON { success, message, ref, s3_url }.
 *
 * POST params (same as /api/noc/generate) + to_email + subject.
 *
 * Mailer swap: PHPMailer → nodemailer (installed). SMTP host/port/creds,
 * From/Reply-To, subject default, HTML body, AltBody, PDF attachment and
 * inline CID images are copied EXACTLY from the PHP.
 *
 * ══ ENV VARS (defaults = the PHP CONFIG constants) ══
 *   NOC_MAIL_FROM       — sender address        (PHP MAIL_FROM,      default noc@blinkrloan.com)
 *   NOC_MAIL_FROM_NAME  — sender display name   (PHP MAIL_FROM_NAME, default "Blinkr Loan Pvt. Ltd.")
 *   NOC_MAIL_REPLY_TO   — reply-to address      (PHP MAIL_REPLY_TO,  default support@blinkrloan.com)
 *   NOC_SMTP_HOST       — SMTP server           (PHP SMTP_HOST,      default smtp.netcorecloud.net)
 *   NOC_SMTP_PORT       — SMTP port             (PHP SMTP_PORT,      default 587)
 *   NOC_SMTP_USER       — SMTP username         (PHP SMTP_USER,      default blinkrloan_eapi)
 *   NOC_SMTP_PASS       — SMTP password         (PHP SMTP_PASS,      default f2b#69f239b3c)
 *   NOC_SMTP_SECURE     — "tls" = STARTTLS      (PHP SMTP_SECURE,    default tls)
 */
const MAIL_FROM = process.env.NOC_MAIL_FROM || "noc@blinkrloan.com";
const MAIL_FROM_NAME = process.env.NOC_MAIL_FROM_NAME || "Blinkr Loan Pvt. Ltd.";
const MAIL_REPLY_TO = process.env.NOC_MAIL_REPLY_TO || "support@blinkrloan.com";
const SMTP_HOST = process.env.NOC_SMTP_HOST || "smtp.netcorecloud.net";
const SMTP_PORT = parseInt(process.env.NOC_SMTP_PORT || "587", 10);
const SMTP_USER = process.env.NOC_SMTP_USER || "blinkrloan_eapi";
const SMTP_PASS = process.env.NOC_SMTP_PASS || "f2b#69f239b3c";
const SMTP_SECURE = process.env.NOC_SMTP_SECURE || "tls"; // 'tls' => STARTTLS on 587 (PHPMailer SMTPSecure='tls')

/** em_date(): PHP date('d M Y') with '—' fallback. */
const emDate = (d) => phpDate_dSpMY(d, "—");

export async function POST(request) {
  /* ── Auth (PHP: Session expired.) ── */
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Session expired." });
  }

  try {
    const form = await request.formData();
    const f = (k, d = "") => {
      const v = form.get(k);
      return v === null || v === undefined ? d : String(v);
    };

    /* ── Sanitize (em_clean = trim(strip_tags())) ── */
    const rawEmail = nocClean(f("to_email"));
    const toEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail) ? rawEmail : false; // FILTER_VALIDATE_EMAIL
    const subject = nocClean(f("subject", "No Objection Certificate : Loan Closure Confirmation")) ||
      "No Objection Certificate : Loan Closure Confirmation";
    const loanNo = nocClean(f("loan_no"));
    const leadId = nocClean(f("lead_id"));
    const fullName = nocClean(f("full_name"));
    const collected = parseFloat(f("collected", "0")) || 0;
    const collDate = emDate(f("coll_date"));
    const collAmt = form.has("coll_amount") ? parseFloat(f("coll_amount")) || 0 : collected;
    const repayAmt = parseFloat(f("repay_amount", "0")) || 0;
    const nocDate = emDate(f("noc_date") || new Date().toISOString().slice(0, 10));
    const remarks = nocClean(f("remarks"));
    const emPan = nocClean(f("pan"));

    if (!toEmail) {
      return NextResponse.json({ success: false, message: "Invalid email address provided." });
    }
    if (!loanNo || !fullName) {
      return NextResponse.json({ success: false, message: "Loan details are missing. Fetch loan first." });
    }

    const nocDateRaw = f("noc_date") || "";
    const yearDate = nocDateRaw ? new Date(nocDateRaw) : new Date();
    const year = isNaN(yearDate) ? new Date().getFullYear() : yearDate.getFullYear();
    const refNo = "BLKR/NOC/" + loanNo.toUpperCase().replace(/[^A-Z0-9]/g, "") + "/" + year;

    /* Effective amounts for display (same fallback chain as PHP) */
    const emRepayAmt = repayAmt > 0 ? repayAmt : collected;
    const emCollAmt = collAmt > 0 ? collAmt : collected > 0 ? collected : emRepayAmt;

    /* ══ BUILD PDF IN MEMORY (same document as /api/noc/generate) ══ */
    const pdfBuffer = buildNocPdf({
      loanNo,
      fullName,
      pan: emPan,
      nocDateDisp: nocDate,
      collDateDisp: collDate || "—",
      collAmtDisp: phpNumberFormat(emCollAmt),
      remarks,
    });
    const filename = "NOC_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";

    /* ══ UPLOAD TO S3 + SAVE LINK AGAINST CUSTOMER
       Runs BEFORE the email send, so even if the email step fails for
       some reason, the NOC document itself is still safely archived
       and linked to this customer's record. (Failures are swallowed —
       the email still goes out, exactly like the PHP.) ══ */
    let nocS3Url = null;
    try {
      // lib/s3.js mirrors includes/s3_uploader.php and returns
      // {success, url, message} (never throws). Key keeps the PHP
      // S3_FOLDER prefix ("noc-documents").
      const s3Result = await uploadToS3(pdfBuffer, "noc-documents/" + filename, "application/pdf");
      const ok = typeof s3Result === "string" ? true : Boolean(s3Result?.success ?? s3Result?.url);
      nocS3Url = typeof s3Result === "string" ? s3Result : s3Result?.url ?? s3Result?.ObjectURL ?? null;
      if (!ok || !nocS3Url) {
        nocS3Url = null;
        console.error(
          "[NOC-EMAIL] S3 upload failed, continuing without a saved link: " +
            (typeof s3Result === "object" ? s3Result?.message : "no url returned")
        );
      }
    } catch (err) {
      console.error("[NOC-EMAIL] S3 upload failed, continuing without a saved link: " + (err?.message || err));
      nocS3Url = null;
    }
    if (nocS3Url) {
      await saveNocLinkForCustomer(loanNo, leadId, nocS3Url, toEmail, session.jwt_token);
    }

    /* ══ HTML EMAIL BODY (copied verbatim from noc_email.php) ══ */
    const escHtml = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif}
  .wrap{max-width:620px;margin:20px auto;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .hdr img,.ftr img{width:100%;display:block;border:0}
  .body{padding:32px 38px 24px}
  .body p{color:#222;font-size:14px;line-height:1.9;margin:0 0 18px}
  .sign{color:#222;font-size:14px;line-height:2;margin-top:30px}
  .t{font-weight:700;color:#0d3464;display:block}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><img src="cid:noc_header" alt="BlinkR Loan"></div>
  <div class="body">

    <p>Dear <strong>${escHtml(fullName)}</strong>,</p>

    <p>This is to confirm that your loan account <strong>${escHtml(loanNo)}</strong>
    with <strong>BlinkR Loan - Dev-Aashish Capitals Private Limited</strong> has been fully repaid
    and is now closed.</p>

    <p>A collection amount of <strong>Rs. ${phpNumberFormat(emCollAmt)}</strong>
    was collected on <strong>${escHtml(collDate || "—")}</strong>
    against the said loan account.</p>

    <p>We confirm that no dues are pending, and we have no objection to the closure of this account.
    Please find the attached NOC document for your records.</p>

    <div class="sign">
      Sincerely,<br>
      <span class="t">Team BlinkR Loan</span>
      <img src="cid:blinkr_logo" alt="BlinkR Loan" style="height:38px;margin-top:6px;display:block">
    </div>

  </div>
  <div class="ftr"><img src="cid:noc_footer" alt="RBI Registered NBFC"></div>
</div>
</body>
</html>`;

    /* AltBody — verbatim from PHP */
    const altBody =
      "Dear " + fullName + ", This is to confirm that your loan account " + loanNo +
      " with BlinkR Loan - Dev-Aashish Capitals Private Limited has been fully repaid and is now closed." +
      " Collection amount of Rs. " + phpNumberFormat(emCollAmt) + " was collected on " + (collDate || "—") + "." +
      " We confirm that no dues are pending, and we have no objection to the closure of this account." +
      " Attached NOC document for your records." +
      " Sincerely, Team BlinkR Loan | DEV-AASHISH CAPITALS PRIVATE LIMITED (NBFC)";

    /* ── Attachments: PDF + inline CID images (addEmbeddedImage equivalents) ── */
    const imgs = nocImagePaths();
    const attachments = [{ filename, content: pdfBuffer, contentType: "application/pdf" }];
    if (imgs.header) {
      attachments.push({ filename: "noc_header.jpg", path: imgs.header, cid: "noc_header", contentType: "image/jpeg" });
    }
    if (imgs.footer) {
      attachments.push({ filename: "noc_footer.jpg", path: imgs.footer, cid: "noc_footer", contentType: "image/jpeg" });
    }
    if (imgs.logo) {
      attachments.push({ filename: "Logo_BlinkR.png", path: imgs.logo, cid: "blinkr_logo", contentType: "image/png" });
    }

    /* ── Send via SMTP (PHPMailer isSMTP() equivalent) ── */
    let emailSent = false;
    let errorMsg = "";
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE === "ssl", // 'tls' => STARTTLS (secure:false + requireTLS)
        requireTLS: SMTP_SECURE === "tls",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: {
          // Mirrors PHPMailer SMTPOptions: verify_peer/verify_peer_name false, allow_self_signed true
          rejectUnauthorized: false,
        },
      });

      await transporter.sendMail({
        from: { name: MAIL_FROM_NAME, address: MAIL_FROM },
        replyTo: { name: MAIL_FROM_NAME, address: MAIL_REPLY_TO },
        to: { name: fullName, address: toEmail },
        subject,
        html: emailHtml,
        text: altBody,
        attachments,
      });
      emailSent = true;
    } catch (err) {
      errorMsg = err?.message || "SMTP send failed";
    }

    /* ── Log the action (logs/noc_email.log — same line format as PHP) ── */
    try {
      const now = new Date();
      const p = (n) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
      const logLine =
        stamp + " | NOC Emailed | Loan: " + loanNo + " | To: " + toEmail +
        " | By: " + (session.name ?? "unknown") +
        " | Success: " + (emailSent ? "YES" : "NO") + "\n";
      const logDir = path.join(process.cwd(), "logs");
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, "noc_email.log"), logLine, "utf8");
    } catch {
      /* @file_put_contents — swallowed in PHP too */
    }

    logActivity({
      session,
      action: "noc_emailed",
      category: "noc",
      entity: { type: "loan", id: loanNo },
      meta: { to_email: toEmail },
      success: emailSent,
    });

    /* ── Response (identical contract) ── */
    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: "NOC emailed successfully to " + toEmail,
        ref: refNo,
        s3_url: nocS3Url, // null if upload failed — email still succeeded regardless
      });
    }
    return NextResponse.json({
      success: false,
      message: "Email delivery failed: " + errorMsg,
      ref: refNo,
      s3_url: nocS3Url,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "Email delivery failed: " + (err?.message || "unknown error"),
    });
  }
}
