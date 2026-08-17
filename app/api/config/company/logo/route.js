import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadToS3 } from "@/lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/config/company/logo — ADMIN only. Uploads a logo image via the
 * existing lib/s3.js helper (same one app/api/noc/email/route.js already
 * uses for PDF attachments) and returns its public URL. Doesn't touch
 * company_config.json itself — the Company Setup page holds the URL in
 * local state until the main Save button persists everything together.
 */
export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(session.roles ?? []).includes("ADMIN")) {
    return NextResponse.json({ success: false, message: "Only admins can upload a logo." }, { status: 403 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("logo");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ success: false, message: "No logo file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, message: "Logo must be a PNG, JPEG, WEBP, or SVG image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, message: "Logo must be under 2MB." }, { status: 400 });
  }

  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg", "image/webp": "webp" }[file.type];
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadToS3(buffer, `company-branding/logo-${Date.now()}.${ext}`, file.type);

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 502 });
  }
  return NextResponse.json({ success: true, url: result.url });
}
