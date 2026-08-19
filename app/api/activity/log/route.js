import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/activity/log — generic audit-log endpoint for actions that only
 * happen client-side (clipboard copy, window.print(), a canvas screenshot
 * download) and so have no natural server round-trip of their own.
 * Only a fixed whitelist of actions can be logged this way — the caller
 * can't just invent an arbitrary action/category to spoof the audit trail.
 */
const ALLOWED_ACTIONS = {
  copy_details: "security",
  print_page: "security",
  screenshot_captured: "security",
  token_copied: "security",
  payment_link_copied: "payments",
};

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const action = String(body.action || "");
  const category = ALLOWED_ACTIONS[action];
  if (!category) {
    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  }

  logActivity({
    session,
    action,
    category,
    entity: body.entity ?? null,
    meta: body.meta ?? {},
  });

  return NextResponse.json({ success: true });
}
