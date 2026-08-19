import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildSettlementLetterPdf } from "@/lib/settlementLetter/pdf";
import { phpNumberFormat, phpDate_dMY, cleanText, todayYmd } from "@/lib/pdfDocKit";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/settlement/letter/email — builds the Settlement Offer Letter
 * PDF in-memory and emails it to the customer.
 * Body: same fields as /generate + { toEmail, subject }
 */
export async function POST(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const toEmail = cleanText(body.toEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(toEmail)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }
    const loanNo = cleanText(body.loanNo);
    const borrowerName = cleanText(body.borrowerName);
    if (!loanNo || !borrowerName) {
      return NextResponse.json({ success: false, message: "Loan number and borrower name are required." }, { status: 400 });
    }
    const subject = cleanText(body.subject) || "Loan Settlement Letter — BlinkR Loan";

    const outstandingAmtDisp = "Rs. " + phpNumberFormat(body.outstanding);
    const waiverAmtDisp = "Rs. " + phpNumberFormat(body.waiver);
    const settleDateDisp = phpDate_dMY(body.settleDate, "--");
    const settleAmtDisp = "Rs. " + phpNumberFormat(body.settleAmt);
    const settleType = cleanText(body.settleType) || "OTS";

    const pdfBuffer = buildSettlementLetterPdf({
      loanNo,
      borrowerName,
      mobile: cleanText(body.mobile),
      outstandingAmtDisp,
      settleType,
      waiverAmtDisp,
      settleDateDisp,
      settleAmtDisp,
    });
    const filename = "Settlement_Letter_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";

    const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:6px;padding:32px 36px;box-shadow:0 2px 12px rgba(0,0,0,.1)">
  <p style="color:#222;font-size:14px;line-height:1.9">Dear <strong>${escHtml(borrowerName)}</strong>,</p>
  <p style="color:#222;font-size:14px;line-height:1.9">This is to confirm the settlement offer on your loan account
  <strong>${escHtml(loanNo)}</strong> — please find the full settlement letter attached, with the settlement amount,
  waiver and settlement date.</p>
  <p style="color:#222;font-size:14px;line-height:1.9">Settlement Amount Payable: <strong>${escHtml(settleAmtDisp)}</strong> by
  <strong>${escHtml(settleDateDisp)}</strong>.</p>
  <p style="color:#222;font-size:14px;line-height:2;margin-top:24px">Regards,<br>
  <strong style="color:#0d3464">Recovery &amp; Collections Team</strong><br>BlinkR Loan</p>
</div>
</body></html>`;
    const text =
      `Dear ${borrowerName}, this confirms the settlement offer on loan account ${loanNo}. ` +
      `Settlement amount payable: ${settleAmtDisp} by ${settleDateDisp}. See the attached letter for full details. ` +
      `Regards, Recovery & Collections Team, BlinkR Loan.`;

    const { sent, error } = await sendMail({
      to: toEmail,
      subject,
      html,
      text,
      attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
    });

    logActivity({
      session,
      action: "settlement_letter_emailed",
      category: "settlement",
      entity: { type: "loan", id: loanNo },
      meta: { to_email: toEmail },
      success: sent,
    });

    if (!sent) {
      return NextResponse.json({ success: false, message: "Email delivery failed: " + error }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: "Settlement letter emailed to " + toEmail });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Email delivery failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }
}
