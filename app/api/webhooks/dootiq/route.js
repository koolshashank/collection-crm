/**
 * POST /api/webhooks/dootiq — port of dootiq_webhook.php.
 * PUBLIC route (no session) — configure this URL in Dootiq's dashboard as
 * the webhook subscription URL. Already whitelisted via the "/api/webhooks"
 * prefix in middleware.js PUBLIC_API.
 *
 * ⚠️ PAYLOAD SHAPE IS A BEST-EFFORT GUESS (same as PHP) — the FULL raw
 * payload is always logged to data/dootiq_webhook_raw.jsonl first, so once
 * a real webhook fires the actual shape can be confirmed and the
 * field-extraction below adjusted — nothing is ever lost.
 *
 * ENV: DOOTIQ_WEBHOOK_SECRET — the 'secret' returned once by
 * /api/whatsapp/register-webhook (default = value currently in the PHP).
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { waConvLog, waConvUpdateStatus } from "@/lib/whatsapp/conversationStore";

export const dynamic = "force-dynamic";

const DOOTIQ_WEBHOOK_SECRET =
  process.env.DOOTIQ_WEBHOOK_SECRET ||
  "d8663f9fa71c5d2fc1faa54be56a512b1e4b9a13450aa91665d9698db2294f8f";

export async function POST(request) {
  try {
    const rawBody = await request.text();

    /* ── Always log the raw payload first — safety net while we confirm the real shape ── */
    try {
      const logDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const headersObj = {};
      request.headers.forEach((v, k) => {
        headersObj[k] = v;
      });
      fs.appendFileSync(
        path.join(logDir, "dootiq_webhook_raw.jsonl"),
        JSON.stringify({
          headers: headersObj,
          body: safeJson(rawBody) ?? rawBody,
          received_at: new Date().toISOString(),
        }) + "\n"
      );
    } catch {
      /* best-effort logging, same as PHP @file_put_contents */
    }

    /* ── Verify signature ── */
    const signatureHeader = request.headers.get("x-tech4logic-signature") || "";
    const expectedSignature = crypto
      .createHmac("sha256", DOOTIQ_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (
      DOOTIQ_WEBHOOK_SECRET !== "REPLACE_WITH_YOUR_SUBSCRIPTION_SECRET" &&
      (!signatureHeader || !timingSafeEquals(expectedSignature, signatureHeader))
    ) {
      return NextResponse.json({ success: false, message: "Invalid signature." }, { status: 401 });
    }

    const payload = safeJson(rawBody);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
    }

    /* ── Best-effort extraction — adjust once real payload shape is confirmed ── */
    const eventType = payload.event ?? payload.type ?? null;
    const from = payload.from ?? payload.sender ?? payload?.contact?.phone ?? null;
    const content = payload.content ?? payload?.message?.text ?? payload.text ?? null;
    const messageId = payload.messageId ?? payload.id ?? null;
    const status = payload.status ?? null;

    if (
      from &&
      content &&
      (!eventType ||
        String(eventType).toLowerCase().includes("message") ||
        String(eventType).toLowerCase().includes("inbound"))
    ) {
      /* Looks like an incoming customer message */
      waConvLog(from, "in", content, messageId, "received");
    } else if (from && messageId && status) {
      /* Looks like a delivery-status update for a message we sent */
      waConvUpdateStatus(from, messageId, status);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/webhooks/dootiq]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function timingSafeEquals(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
