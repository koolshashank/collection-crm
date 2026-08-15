import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export async function POST() {
  const session = getSession();
  if (session) logActivity({ session, action: "logout", category: "auth" });
  clearSession();
  return NextResponse.json({ success: true, redirect: "/login" });
}

export async function GET() {
  const session = getSession();
  if (session) logActivity({ session, action: "logout", category: "auth" });
  clearSession();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
