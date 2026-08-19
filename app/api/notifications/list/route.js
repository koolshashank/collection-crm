import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function isAdminUser(session) {
  return (session?.roles ?? []).includes("ADMIN");
}

/** GET /api/notifications/list — ADMIN only. Recent security alerts + unread count. */
export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  return NextResponse.json({ success: true, ...listNotifications({ limit: 50 }) });
}
