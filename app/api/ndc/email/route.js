import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { buildNdcPdf } from "@/lib/ndc/pdf";
import { phpNumberFormat, phpDate_dMY, cleanText, today_dMY, todayYmd } from "@/lib/pdfDocKit";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/ndc/email — builds the No Dues Certificate PDF in-memory and
 * emails it to the customer after a settlement is paid off.
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
    const subject = cleanText(body.subject) || "No Dues Certificate — Settlement Confirmation";

    const settleDateDisp = phpDate_dMY(body.settleDate, "--");
    const settleAmtDisp = phpNumberFormat(body.settleAmt);
    const waiverAmtDisp = phpNumberFormat(body.waiver);
    const ndcDateDisp = today_dMY();
    const pan = cleanText(body.pan);
    const remarks = cleanText(body.remarks);

    const pdfBuffer = buildNdcPdf({
      loanNo,
      borrowerName,
      pan,
      ndcDateDisp,
      settleDateDisp,
      settleAmtDisp,
      waiverAmtDisp,
      remarks,
    });
    const filename = "NDC_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";

    const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:6px;padding:32px 36px;box-shadow:0 2px 12px rgba(0,0,0,.1)">
  <p style="color:#222;font-size:14px;line-height:1.9">Dear <strong>${escHtml(borrowerName)}</strong>,</p>
  <p style="color:#222;font-size:14px;line-height:1.9">This confirms that your loan account <strong>${escHtml(loanNo)}</strong>
  with <strong>BlinkR Loan - Dev-Aashish Capitals Private Limited</strong> has been settled — an amount of
  <strong>Rs. ${escHtml(settleAmtDisp)}</strong> was received on <strong>${escHtml(settleDateDisp)}</strong> in full and final
  settlement.</p>
  <p style="color:#222;font-size:14px;line-height:1.9">We confirm that no further dues are pending. Please find the attached
  No Dues Certificate for your records.</p>
  <p style="color:#222;font-size:14px;line-height:2;margin-top:24px">Sincerely,<br>
  <strong style="color:#0d3464">Team BlinkR Loan</strong></p>
</div>
</body></html>`;
    const text =
      `Dear ${borrowerName}, this confirms that loan account ${loanNo} has been settled — Rs. ${settleAmtDisp} received on ` +
      `${settleDateDisp} in full and final settlement. No further dues are pending. See the attached No Dues Certificate. ` +
      `Sincerely, Team BlinkR Loan.`;

    const { sent, error } = await sendMail({
      to: toEmail,
      subject,
      html,
      text,
      attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
    });

    logActivity({
      session,
      action: "ndc_emailed",
      category: "settlement",
      entity: { type: "loan", id: loanNo },
      meta: { to_email: toEmail },
      success: sent,
    });

    if (!sent) {
      return NextResponse.json({ success: false, message: "Email delivery failed: " + error }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: "NDC emailed to " + toEmail });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Email delivery failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }
}
