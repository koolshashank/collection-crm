/**
 * POST /api/whatsapp/register-webhook — port of register_dootiq_webhook.php.
 *
 * ⚠️ RUN THIS ONCE. The returned 'secret' is displayed ONLY THIS ONE TIME —
 * copy it immediately into the DOOTIQ_WEBHOOK_SECRET env var used by
 * /api/webhooks/dootiq. Running it again creates a duplicate subscription.
 *
 * Body (optional): { url, events } — defaults match the PHP script.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dootiqRegisterWebhook } from "@/lib/whatsapp/dootiq";

export const dynamic = "force-dynamic";

// ⚠️ CHANGE THIS to your real public domain (must be HTTPS) — same default as PHP
const DEFAULT_WEBHOOK_URL =
  process.env.DOOTIQ_WEBHOOK_URL ||
  "https://blinkrloan.deepijatel.in/QuantilixCRM/dootiq_webhook.php";

export async function POST(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let input = {};
    try {
      input = await request.json();
    } catch {
      input = {};
    }

    const webhookUrl = String(input?.url ?? "").trim() || DEFAULT_WEBHOOK_URL;
    // add more event names if Dootiq's docs list others (e.g. status updates)
    const events = Array.isArray(input?.events) && input.events.length ? input.events : ["message.received"];

    const result = await dootiqRegisterWebhook(webhookUrl, events);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Webhook registered successfully.",
        data: result.data,
        note: "SAVE THE SECRET NOW — IT WILL NOT BE SHOWN AGAIN. Put it in the DOOTIQ_WEBHOOK_SECRET env var.",
      });
    }
    return NextResponse.json({ success: false, message: result.message, data: result.data });
  } catch (err) {
    console.error("[/api/whatsapp/register-webhook]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
