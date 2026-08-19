import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resetUserRecord } from "@/lib/twoFactorStore";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/employees/2fa-status/reset — ADMIN only. Clears a user's TOTP
 * enrollment so they're forced to set up their authenticator app again on
 * next login (e.g. after losing/switching phones).
 */
function isAdminUser(session) {
  return (session?.roles ?? []).includes("ADMIN");
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

  const userId = String(body.userId || "").trim();
  const userName = String(body.userName || "").trim();
  if (!userId) {
    return NextResponse.json({ success: false, message: "userId is required." }, { status: 400 });
  }

  const wasEnrolled = resetUserRecord(userId);

  logActivity({
    session,
    action: "two_factor_reset",
    category: "auth",
    entity: { type: "employee", id: userId },
    meta: { userName, wasEnrolled },
  });

  return NextResponse.json({
    success: true,
    message: wasEnrolled
      ? "2FA has been reset. The user will be asked to set up their authenticator app again at next login."
      : "This user had no 2FA enrollment to reset.",
  });
}
