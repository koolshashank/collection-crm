import { NextResponse } from "next/server";
import { apiPost } from "@/lib/serverApi";
import { setSession, setPendingSession } from "@/lib/session";
import { getUserRecord } from "@/lib/twoFactorStore";
import { readTwoFactorPolicy } from "@/lib/twoFactorPolicy";
import { logActivity } from "@/lib/auditLog";
import { sendLoginAlertEmail } from "@/lib/loginAlert";

// Same allow-list as login.php
const ALLOWED_ROLES = [
  "COLLECTION-HEAD",
  "ADMIN",
  "COLLECTION-EXECUTIVE",
  "VISITOR",
  "ACCOUNTS",
  "RECOVERY_HEAD",
  "ACM",
];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "").trim();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 200);

  if (!username || !password) {
    return NextResponse.json({ success: false, message: "Please fill in all fields." }, { status: 400 });
  }

  const res = await apiPost("login", { email: username, password }, { token: "", timeoutMs: 30000 });

  if (res.error) {
    return NextResponse.json({ success: false, message: `Connection error: ${res.error}` }, { status: 502 });
  }

  const result = res.data;
  if (res.status === 200 && result?.token) {
    if (!result.employee) {
      return NextResponse.json({ success: false, message: "Employee data not found." }, { status: 400 });
    }
    const roles = result.employee.roles || [];
    const authorized = roles.some((r) => ALLOWED_ROLES.includes(r));
    const sessionPayload = {
      username,
      jwt_token: result.token,
      user_id: result.employee.id,
      roles,
      name: `${result.employee.f_name} ${result.employee.l_name}`,
    };

    if (!authorized) {
      logActivity({
        session: sessionPayload,
        action: "login_failed",
        category: "auth",
        meta: { reason: "unauthorized_role", ip, user_agent: userAgent },
        success: false,
      });
      await sendLoginAlertEmail({ attemptedUsername: username, ip, userAgent, reason: "unauthorized_role" });
      return NextResponse.json(
        { success: false, message: "You are not authorized to access this system." },
        { status: 403 }
      );
    }

    if (!readTwoFactorPolicy().required) {
      setSession(sessionPayload);
      logActivity({ session: sessionPayload, action: "login", category: "auth" });
      return NextResponse.json({ success: true, redirect: "/dashboard" });
    }

    setPendingSession(sessionPayload);
    const record = getUserRecord(result.employee.id);
    if (record?.secret) {
      return NextResponse.json({ success: true, requires2FA: true });
    }
    return NextResponse.json({ success: true, requiresSetup: true });
  }

  logActivity({
    session: { username },
    action: "login_failed",
    category: "auth",
    meta: { reason: "invalid_credentials", ip, user_agent: userAgent },
    success: false,
  });
  await sendLoginAlertEmail({ attemptedUsername: username, ip, userAgent, reason: "invalid_credentials" });
  return NextResponse.json(
    { success: false, message: result?.message || "Invalid email or password." },
    { status: 401 }
  );
}
