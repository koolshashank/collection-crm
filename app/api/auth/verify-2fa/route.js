import { NextResponse } from "next/server";
import { getPendingSession, setSession, clearPendingSession } from "@/lib/session";
import { getUserRecord } from "@/lib/twoFactorStore";
import { verifyCode } from "@/lib/twoFactor";
import { logActivity } from "@/lib/auditLog";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const pending = getPendingSession();
  if (!pending) {
    return NextResponse.json(
      { success: false, message: "Your session has expired. Please log in again." },
      { status: 400 }
    );
  }

  const record = getUserRecord(pending.user_id);
  if (!record?.secret) {
    return NextResponse.json(
      { success: false, message: "Please complete two-factor setup first." },
      { status: 400 }
    );
  }

  const code = String(body?.code ?? "").trim();
  if (!(await verifyCode(record.secret, code))) {
    logActivity({
      session: pending,
      action: "login_failed",
      category: "auth",
      meta: { reason: "invalid_2fa_code" },
      success: false,
    });
    return NextResponse.json({ success: false, message: "Invalid code. Please try again." }, { status: 401 });
  }

  setSession(pending);
  clearPendingSession();
  logActivity({ session: pending, action: "login", category: "auth", meta: { two_fa: true } });
  return NextResponse.json({ success: true, redirect: "/dashboard" });
}
