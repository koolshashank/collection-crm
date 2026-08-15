import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiPost } from "@/lib/serverApi";
import { logActivity } from "@/lib/auditLog";

const VALID_GENDERS = ["M", "F", "O"];
const VALID_ROLES = ["ADMIN", "COLLECTION-HEAD", "COLLECTION-EXECUTIVE", "RECOVERY_HEAD", "ACCOUNTS", "VISITOR"];

/**
 * POST /api/employees/create — port of the create-user form handler in
 * add_employee.php. ADMIN only. Proxies to the real backend
 * (collection/create-employee) with the session's JWT — same validation
 * rules as the PHP page, re-checked server-side since client validation
 * can be bypassed.
 */
export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(session.roles ?? []).includes("ADMIN")) {
    return NextResponse.json({ success: false, message: "Only admins can create users." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const first_name = String(body.first_name || "").trim();
  const last_name = String(body.last_name || "").trim();
  const email = String(body.email || "").trim();
  const password = String(body.password || "").trim();
  const gender = String(body.gender || "").trim();
  const mobile = String(body.mobile || "").trim();
  const roleNames = Array.isArray(body.roleNames) ? body.roleNames.map((r) => String(r).trim()).filter(Boolean) : [];

  const errors = [];
  if (!first_name) errors.push("First name is required.");
  if (!last_name) errors.push("Last name is required.");
  if (!email) errors.push("Email is required.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!password) errors.push("Password is required.");
  else if (password.length < 6) errors.push("Password must be at least 6 characters.");
  if (!gender || !VALID_GENDERS.includes(gender)) errors.push("Please select a gender.");
  if (!mobile) errors.push("Mobile number is required.");
  else if (!/^\d{10}$/.test(mobile)) errors.push("Enter a valid 10-digit mobile number.");
  if (roleNames.length === 0) errors.push("Please select at least one role.");
  else if (roleNames.some((r) => !VALID_ROLES.includes(r))) errors.push("One or more selected roles are invalid.");

  if (errors.length) {
    return NextResponse.json({ success: false, message: errors.join(" ") }, { status: 400 });
  }

  const res = await apiPost("create_employee", {
    f_name: first_name,
    l_name: last_name,
    email,
    password,
    gender,
    mobile,
    roleNames,
  });

  if (res.error) {
    return NextResponse.json({ success: false, message: `Connection error: ${res.error}` }, { status: 502 });
  }

  const result = res.data !== null && typeof res.data === "object" ? res.data : null;
  const success = res.ok && result !== null;

  logActivity({
    session,
    action: "employee_created",
    category: "employees",
    entity: { type: "employee", id: email },
    meta: { email, mobile, roleNames },
    success,
  });

  if (success) {
    return NextResponse.json({ success: true, message: result.message || "Employee created successfully!" });
  }

  return NextResponse.json(
    { success: false, message: result?.message || `API error (HTTP ${res.status})` },
    { status: res.status && res.status >= 400 ? res.status : 502 }
  );
}
