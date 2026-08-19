import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildNocPdf, phpNumberFormat, today_dMY } from "@/lib/noc/pdf";

export const dynamic = "force-dynamic";

/**
 * POST /api/noc/preview — renders a sample NOC PDF from a draft template
 * (unsaved edits in the Settings form) so an admin can see the full
 * certificate before saving. Sample loan data only — never touches real
 * customer records. Admin only, same as the config route.
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
    const pdfBuffer = buildNocPdf({
      loanNo: "BLKR00012345",
      fullName: "John Doe",
      pan: "ABCDE1234F",
      nocDateDisp: today_dMY(),
      collDateDisp: "15-Jan-2026",
      collAmtDisp: phpNumberFormat(50000),
      remarks: "",
      template: body.template,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=noc_preview.pdf",
        "Content-Length": String(pdfBuffer.length),
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
