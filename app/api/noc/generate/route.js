import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildNocPdf, nocClean, phpDate_dMY, phpNumberFormat, todayYmd } from "@/lib/noc/pdf";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/noc/generate — port of noc_generate.php.
 * Accepts the same multipart/form-data fields and streams back the NOC PDF
 * as a download (Content-Disposition: attachment), filename
 * NOC_<loan>_<Ymd>.pdf — identical output contract to FPDF's Output('D').
 *
 * PDF engine swap: FPDF → jsPDF (see lib/noc/pdf.js). Text, layout constants
 * and header/footer images (public/assets/noc_header.jpg / noc_Footer.jpg)
 * match the PHP 1:1.
 */
export async function POST(request) {
  /* ── Auth (PHP: http_response_code(403); die('Unauthorized');) ── */
  const session = getSession();
  if (!session?.jwt_token) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const form = await request.formData();
    const f = (k, d = "") => {
      const v = form.get(k);
      return v === null || v === undefined ? d : String(v);
    };

    /* ══ INPUT (same names + fallbacks as PHP) ══ */
    const loanNo = nocClean(f("loan_no"));
    const fullName = nocClean(f("full_name"));
    const pan = nocClean(f("pan"));
    const collected = parseFloat(f("collected", "0")) || 0;
    const repayAmt = form.has("repay_amount") ? parseFloat(f("repay_amount")) || 0 : collected;
    const nocDate = phpDate_dMY(f("noc_date") || new Date().toISOString().slice(0, 10), "--");
    const remarks = nocClean(f("remarks"));

    const collDate = phpDate_dMY(f("coll_date"), "--"); // noc_dt() with '--' fallback
    const collAmt = form.has("coll_amount") ? parseFloat(f("coll_amount")) || 0 : collected;

    /* Use collected amount if > 0, else fall back to repay_amount */
    const displayAmt = collected > 0 ? collected : repayAmt;
    /* Collection display amount: prefer coll_amount, else fall back to collected/repay */
    const displayCollAmt = collAmt > 0 ? collAmt : displayAmt;

    /* ══ BUILD PDF ══ */
    const pdfBuffer = buildNocPdf({
      loanNo,
      fullName,
      pan,
      nocDateDisp: nocDate,
      collDateDisp: collDate || "--",
      collAmtDisp: phpNumberFormat(displayCollAmt),
      remarks,
    });

    logActivity({
      session,
      action: "noc_generated",
      category: "noc",
      entity: { type: "loan", id: loanNo },
    });

    /* ══ STREAM (FPDF Output('D', $fname)) ══ */
    const fname = "NOC_" + loanNo.replace(/[^A-Z0-9_-]/gi, "_") + "_" + todayYmd() + ".pdf";
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
    /* Mirrors the PHP JSON error contract used when the PDF lib fails */
    return NextResponse.json(
      { success: false, message: "PDF generation failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }
}
