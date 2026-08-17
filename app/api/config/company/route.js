import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";
import { readCompanyConfig, writeCompanyConfig, resetCompanyConfig } from "@/lib/companyConfig";
import { isValidHex } from "@/lib/colorUtils";

export const dynamic = "force-dynamic";

/**
 * /api/config/company — Company Setup (app name, tagline, logo, theme).
 *
 * GET is public (no session) — the pre-login screen needs to show the
 * configured branding before anyone is authenticated.
 * POST/DELETE are ADMIN only, same strict gate as /api/employees/create —
 * rebranding the whole app is an admin-level action.
 */

function isAdmin(session) {
  return (session?.roles ?? []).includes("ADMIN");
}

export async function GET() {
  return NextResponse.json({ success: true, config: readCompanyConfig() });
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ success: false, message: "Only admins can change company setup." }, { status: 403 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const appName = String(body.appName || "").trim();
  const tagline = String(body.tagline || "").trim();
  const accent = String(body.accent || "").trim();
  const navy = String(body.navy || "").trim();

  const errors = [];
  if (!appName) errors.push("App name is required.");
  if (!tagline) errors.push("Tagline is required.");
  if (!isValidHex(accent)) errors.push("Primary color must be a valid hex color.");
  if (!isValidHex(navy)) errors.push("Secondary color must be a valid hex color.");
  if (errors.length) {
    return NextResponse.json({ success: false, message: errors.join(" ") }, { status: 400 });
  }

  const result = writeCompanyConfig({ appName, tagline, logoUrl: body.logoUrl || null, accent, navy });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }

  logActivity({
    session,
    action: "settings_changed",
    category: "settings",
    meta: { config: "company", appName, tagline, accent, navy, hasLogo: !!body.logoUrl },
  });

  return NextResponse.json({ success: true, config: result.config, message: "Company setup saved." });
}

export async function DELETE() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ success: false, message: "Only admins can reset company setup." }, { status: 403 });
  }

  const result = resetCompanyConfig();
  if (!result.ok) {
    return NextResponse.json({ success: false, message: "Could not reset config file." }, { status: 500 });
  }

  logActivity({ session, action: "settings_changed", category: "settings", meta: { config: "company", reset: true } });

  return NextResponse.json({ success: true, config: result.config, message: "Company setup reset to default." });
}
