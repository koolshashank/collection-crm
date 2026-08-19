import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = {
  "image/jpeg": { ext: "jpg", format: "JPEG" },
  "image/png": { ext: "png", format: "PNG" },
  "image/webp": { ext: "webp", format: "WEBP" },
};
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * POST /api/config/document-header-footer/upload — admin only (ADMIN /
 * COLLECTION-HEAD / RECOVERY_HEAD — same gate as the rest of Settings).
 * Saves a header/footer banner image under public/assets (fixed filename
 * per slot, overwritten on every upload) and returns its public URL +
 * jsPDF image format. Doesn't touch document_header_footer_config.json
 * itself — the Settings page holds the URL in local state until the main
 * Save button persists everything together (same pattern as the company
 * logo upload).
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
    return NextResponse.json({ success: false, message: "Only admins can upload document images." }, { status: 403 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid upload." }, { status: 400 });
  }

  const slot = String(formData.get("slot") || "");
  if (!["header", "footer"].includes(slot)) {
    return NextResponse.json({ success: false, message: "Invalid slot — must be 'header' or 'footer'." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ success: false, message: "No image file provided." }, { status: 400 });
  }
  const meta = ALLOWED_TYPES[file.type];
  if (!meta) {
    return NextResponse.json({ success: false, message: "Image must be JPEG, PNG, or WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, message: "Image must be under 3MB." }, { status: 400 });
  }

  const filename = `custom_noc_${slot}.${meta.ext}`;
  const dir = path.join(process.cwd(), "public", "assets");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buffer);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Could not save image: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, url: `/assets/${filename}`, format: meta.format });
}
