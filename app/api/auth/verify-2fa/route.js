import { NextResponse } from "next/server";
import { getPendingSession, setSession, clearPendingSession } from "@/lib/session";
import { getUserRecord, setUserRecord } from "@/lib/twoFactorStore";
import { verifyCode } from "@/lib/twoFactor";
import { logActivity } from "@/lib/auditLog";
import { sendLoginAlertEmail } from "@/lib/loginAlert";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 200);

  const pending = getPendingSession();
  if (!pending) {
    return NextResponse.json(
      { success: false, message: "Your session has expired. Please log in again." },
      { status: 400 }
    );
  }

  /* Enrolled users verify against their saved secret; a user still mid-setup
     verifies against the not-yet-persisted secret sitting on the pending
     session (see setup-2fa/route.js). */
  const record = getUserRecord(pending.user_id);
  const secret = record?.secret ?? pending.pendingSecret;
  if (!secret) {
    return NextResponse.json(
      { success: false, message: "Please complete two-factor setup first." },
      { status: 400 }
    );
  }

  const code = String(body?.code ?? "").trim();
  if (!(await verifyCode(secret, code))) {
    logActivity({
      session: pending,
      action: "login_failed",
      category: "auth",
      meta: { reason: "invalid_2fa_code", ip, user_agent: userAgent },
      success: false,
    });
    await sendLoginAlertEmail({ attemptedUsername: pending?.username, ip, userAgent, reason: "invalid_2fa_code" });
    return NextResponse.json({ success: false, message: "Invalid code. Please try again." }, { status: 401 });
  }

  /* First successful confirmation of a fresh setup — persist the secret now
     that we know the user actually saved it in their authenticator app. */
  if (!record?.secret && pending.pendingSecret) {
    setUserRecord(pending.user_id, { secret: pending.pendingSecret, username: pending.username });
  }

  const { pendingSecret, ...sessionFields } = pending;
  setSession(sessionFields);
  clearPendingSession();
  logActivity({ session: sessionFields, action: "login", category: "auth", meta: { two_fa: true } });
  return NextResponse.json({ success: true, redirect: "/dashboard" });
}
