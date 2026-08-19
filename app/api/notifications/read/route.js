import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { markAllRead, markRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function isAdminUser(session) {
  return (session?.roles ?? []).includes("ADMIN");
}

/** POST /api/notifications/read — ADMIN only. Body: { all: true } or { ids: [...] }. */
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

  if (body.all) markAllRead();
  else if (Array.isArray(body.ids)) markRead(body.ids);

  return NextResponse.json({ success: true });
}
