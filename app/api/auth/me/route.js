import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { jwt_token, ...safe } = session;
  return NextResponse.json({ success: true, user: safe });
}
