import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMonthlyTarget, saveMonthlyTarget } from "@/lib/monthlyTargetStore";

export async function GET() {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, target: getMonthlyTarget() });
}

export async function POST(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const roles = session.roles || [];
  if (!roles.includes("ADMIN") && !roles.includes("COLLECTION-HEAD")) {
    return NextResponse.json({ success: false, message: "Not authorized to set targets." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const target = saveMonthlyTarget(body);
  return NextResponse.json({ success: true, target });
}
