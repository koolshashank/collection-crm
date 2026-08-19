import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildNdcPdf } from "@/lib/ndc/pdf";
import { today_dMY } from "@/lib/pdfDocKit";

export const dynamic = "force-dynamic";

/**
 * POST /api/ndc/preview — renders a sample NDC PDF from a draft template
 * (unsaved edits in Settings), using fake loan data only. Admin only,
 * mirrors /api/noc/preview.
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

  try {
    const pdfBuffer = buildNdcPdf({
      loanNo: "BLKR00021946",
      borrowerName: "Ramesh Kumar Yadav",
      pan: "ABCPY1234K",
      ndcDateDisp: today_dMY(),
      settleDateDisp: "20-Aug-2026",
      settleAmtDisp: "72,000.00",
      waiverAmtDisp: "26,500.00",
      remarks: "",
      template: body.template,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=ndc_preview.pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Preview failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }
}
