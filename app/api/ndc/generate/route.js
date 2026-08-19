import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildNdcPdf } from "@/lib/ndc/pdf";
import { phpNumberFormat, phpDate_dMY, cleanText, today_dMY, todayYmd } from "@/lib/pdfDocKit";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/ndc/generate — builds the No Dues Certificate PDF for one
 * settled loan and streams it back as a download.
 * Body: { loanNo, borrowerName, pan, settleDate, settleAmt, waiver, remarks }
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

    const pdfBuffer = buildNdcPdf({
      loanNo,
      borrowerName,
      pan: cleanText(body.pan),
      ndcDateDisp: today_dMY(),
      settleDateDisp: phpDate_dMY(body.settleDate, "--"),
      settleAmtDisp: phpNumberFormat(body.settleAmt),
      waiverAmtDisp: phpNumberFormat(body.waiver),
      remarks: cleanText(body.remarks),
    });

    logActivity({
      session,
      action: "ndc_generated",
      category: "settlement",
      entity: { type: "loan", id: loanNo },
    });

    const fname = "NDC_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";
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
