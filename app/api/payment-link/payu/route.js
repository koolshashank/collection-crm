/**
 * POST /api/payment-link/payu — port of generate_payment_link_payu.php.
 *
 * Proxies to:
 *   POST https://backend.blinkrloan.com/api/collection/generate-payment-link-payu
 *
 * Body: { lead_id, partial_amount, full_payment, sms, email, payu_method: "upi"|"other" }
 *
 * ENV: PAYU_LINK_URL — gateway endpoint (default = PHP URL).
 * Gateway on/off state lives in data/gateway_config.json (see lib/gatewayConfig.js);
 * like the PHP, this handler does not gate on it — the UI reads the config.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const PAYU_LINK_URL =
  process.env.PAYU_LINK_URL ||
  "https://backend.blinkrloan.com/api/collection/generate-payment-link-payu";

export async function POST(request) {
  try {
    const session = getSession();
    const token = session?.jwt_token ?? "";
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized – Token Missing" });
    }

    let input = {};
    try {
      input = await request.json();
    } catch {
      input = {};
    }

    const lead_id = input?.lead_id ?? null;
    const partial_amount = input?.partial_amount ?? 0;
    const full_payment = input?.full_payment ?? false;
    const sms = input?.sms ?? false;
    const email = input?.email ?? false;
    const payu_method = input?.payu_method ?? null;

    if (!lead_id) {
      return NextResponse.json({ success: false, message: "lead_id is required" });
    }
    if (!["upi", "other"].includes(payu_method)) {
      return NextResponse.json({ success: false, message: "Invalid PayU method" });
    }

    const payload = JSON.stringify({
      lead_id: parseInt(lead_id, 10),
      partial_amount: parseFloat(partial_amount) || 0,
      full_payment: Boolean(full_payment),
      sms: Boolean(sms),
      email: Boolean(email),
      sub_payment_method: payu_method,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let responseText = "";
    try {
      const res = await fetch(PAYU_LINK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: `employee_jwt=${token}`,
        },
        body: payload,
        signal: controller.signal,
        cache: "no-store",
      });
      responseText = await res.text();
    } catch (err) {
      const msg = err?.name === "AbortError" ? "Timeout was reached" : err?.message || "network error";
      return NextResponse.json({ success: false, message: `Connection error: ${msg}` });
    } finally {
      clearTimeout(timer);
    }

    /* pass through the gateway response directly, same as the PHP */
    try {
      const decoded = JSON.parse(responseText);
      logActivity({
        session,
        action: "payment_link_generated",
        category: "payments",
        entity: { type: "lead", id: lead_id },
        meta: { gateway: "payu", method: payu_method },
        success: decoded?.success !== false,
      });
      return new NextResponse(responseText, { headers: { "Content-Type": "application/json" } });
    } catch {
      return NextResponse.json({ success: false, message: "Invalid response from payment gateway." });
    }
  } catch (err) {
    console.error("[/api/payment-link/payu]", err?.message || err);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
