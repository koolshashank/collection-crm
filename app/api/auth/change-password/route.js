import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiPut } from "@/lib/serverApi";
import { logActivity } from "@/lib/auditLog";

/**
 * POST /api/auth/change-password — self-service password change from the
 * profile menu. Proxies to the real backend (PUT crm/employee/change-password)
 * using the logged-in user's own email + session JWT — a user can only ever
 * change their own password through this route.
 */
export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const newPassword = String(body?.newPassword || "").trim();
  const confirmPassword = String(body?.confirmPassword || "").trim();

  if (!newPassword) {
    return NextResponse.json({ success: false, message: "New password is required." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ success: false, message: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, message: "Passwords do not match." }, { status: 400 });
  }

  const res = await apiPut("change_password", {
    email: session.username,
    newpassword: newPassword,
  });

  if (res.error) {
    return NextResponse.json({ success: false, message: `Connection error: ${res.error}` }, { status: 502 });
  }

  const success = res.ok;
  const result = res.data !== null && typeof res.data === "object" ? res.data : null;

  logActivity({
    session,
    action: "password_changed",
    category: "auth",
    entity: { type: "employee", id: session.username },
    success,
  });

  if (success) {
    return NextResponse.json({ success: true, message: result?.message || "Password changed successfully." });
  }

  return NextResponse.json(
    { success: false, message: result?.message || `API error (HTTP ${res.status})` },
    { status: res.status && res.status >= 400 ? res.status : 502 }
  );
}
