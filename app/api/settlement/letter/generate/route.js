import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildSettlementLetterPdf } from "@/lib/settlementLetter/pdf";
import { phpNumberFormat, phpDate_dMY, cleanText, todayYmd } from "@/lib/pdfDocKit";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/settlement/letter/generate — builds the Settlement Offer Letter
 * PDF for one settlement case and streams it back as a download.
 * Body: { loanNo, borrowerName, mobile, outstanding, settleType, waiver, settleDate, settleAmt }
 */
export async function POST(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const loanNo = cleanText(body.loanNo);
    const borrowerName = cleanText(body.borrowerName);
    if (!loanNo || !borrowerName) {
      return NextResponse.json({ success: false, message: "Loan number and borrower name are required." }, { status: 400 });
    }

    const pdfBuffer = buildSettlementLetterPdf({
      loanNo,
      borrowerName,
      mobile: cleanText(body.mobile),
      outstandingAmtDisp: "Rs. " + phpNumberFormat(body.outstanding),
      settleType: cleanText(body.settleType) || "OTS",
      waiverAmtDisp: "Rs. " + phpNumberFormat(body.waiver),
      settleDateDisp: phpDate_dMY(body.settleDate, "--"),
      settleAmtDisp: "Rs. " + phpNumberFormat(body.settleAmt),
    });

    logActivity({
      session,
      action: "settlement_letter_generated",
      category: "settlement",
      entity: { type: "loan", id: loanNo },
    });

    const fname = "Settlement_Letter_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "PDF generation failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }
}
