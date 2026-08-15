/**
 * POST /api/payment-link/paytm — port of generate_payment_link_paytm.php.
 *
 * Proxies to:
 *   POST https://api.blinkrloan.com/api/paytracker/v1/payment/generate-payment-link-paytm
 *
 * Body:
 * {
 *   "lead_id": 44175, "sms": true, "email": true, "full_payment": true,
 *   "partial_amount": 500,
 *   "success_url": "https://api.blinkrloan.com/success",
 *   "failure_url": "https://api.blinkrloan.com/failure"
 * }
 *
 * ENV: PAYTM_LINK_URL — gateway endpoint (default = PHP URL).
 * Gateway on/off state lives in data/gateway_config.json (see lib/gatewayConfig.js);
 * like the PHP, this handler does not gate on it — the UI reads the config.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const PAYTM_LINK_URL =
  process.env.PAYTM_LINK_URL ||
  "https://api.blinkrloan.com/api/paytracker/v1/payment/generate-payment-link-paytm";
const PAYTM_SUCCESS_URL = process.env.PAYTM_SUCCESS_URL || "https://api.blinkrloan.com/success";
const PAYTM_FAILURE_URL = process.env.PAYTM_FAILURE_URL || "https://api.blinkrloan.com/failure";

export async function POST(request) {
  try {
    /* ── Auth check ── */
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }
    const jwt = session.jwt_token;

    /* ── Read + validate JSON body ── */
    let input = null;
    try {
      input = await request.json();
    } catch {
      input = null;
    }
    if (!input || !input.lead_id) {
      return NextResponse.json({ success: false, message: "Invalid request body" });
    }

    const payload = JSON.stringify({
      lead_id: parseInt(input.lead_id, 10),
      sms: Boolean(input.sms ?? true),
      email: Boolean(input.email ?? true),
      full_payment: Boolean(input.full_payment ?? true),
      partial_amount: parseFloat(input.partial_amount ?? 0) || 0,
      success_url: input.success_url ?? PAYTM_SUCCESS_URL,
      failure_url: input.failure_url ?? PAYTM_FAILURE_URL,
    });

    /* ── POST to Paytm endpoint ── */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let responseText = "";
    let httpCode = 0;
    let curlErr = 0;
    try {
      const res = await fetch(PAYTM_LINK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          Cookie: `employee_jwt=${jwt}`,
        },
        body: payload,
        signal: controller.signal,
        cache: "no-store",
      });
      httpCode = res.status;
      responseText = await res.text();
    } catch {
      curlErr = 1;
    } finally {
      clearTimeout(timer);
    }

    /* ── Return result to client ── */
    if (curlErr || !responseText) {
      return NextResponse.json({
        success: false,
        message: `Connection error (cURL #${curlErr}). HTTP ${httpCode}.`,
      });
    }

    let decoded = null;
    try {
      decoded = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid response from payment gateway." });
    }

    logActivity({
      session,
      action: "payment_link_generated",
      category: "payments",
      entity: { type: "lead", id: input.lead_id },
      meta: { gateway: "paytm" },
      success: decoded?.success === true || Boolean(decoded?.PaymentLink ?? decoded?.payment_link ?? decoded?.link),
    });

    /* Normalise response — pass through as-is if it already has success/data */
    if (decoded && typeof decoded === "object" && !("success" in decoded)) {
      /* Wrap bare response */
      const link = decoded.PaymentLink ?? decoded.payment_link ?? decoded.link ?? null;
      if (link) {
        return NextResponse.json({ success: true, data: { PaymentLink: link } });
      }
      return NextResponse.json({
        success: false,
        message: decoded.message ?? "No link returned.",
        raw: decoded,
      });
    }

    /* pass through the API response directly */
    return new NextResponse(responseText, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[/api/payment-link/paytm]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
