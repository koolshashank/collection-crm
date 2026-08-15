import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawPost } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

/**
 * POST /api/payments/post-payment
 * Port of post-payment-api.php — forwards the payment update body unchanged
 * to collection/post-payment-manually.
 *
 * PHP behaviour preserved 1:1:
 * - 401-style "Unauthorized – Token Missing" if no session token (PHP returned this as 200 JSON, kept same).
 * - Sends BOTH `Authorization: Bearer <token>` and `Cookie: employee_jwt=<token>`
 *   (backend apparently checks either).
 * - 20s timeout (CURLOPT_TIMEOUT => 20 in the PHP source).
 * - success = result.success truthy OR http status in 200–299 range.
 * - message = result.message, else "Payment submitted!" / "Submission failed".
 */
export async function POST(request) {
  const token = getSession()?.jwt_token || "";
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized – Token Missing" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const res = await rawPost(
    apiUrl("collection/post-payment-manually"),
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `employee_jwt=${token}`,
      },
      timeoutMs: 20000,
    }
  );

  if (res.error) {
    return NextResponse.json({ success: false, message: "Connection error" });
  }

  const result = res.data !== null && typeof res.data === "object" ? res.data : null;
  if (result === null) {
    return NextResponse.json({
      success: false,
      message: `Invalid API response (HTTP ${res.status})`,
    });
  }

  const httpOk = res.status >= 200 && res.status < 300;
  const success = Boolean(result.success) || httpOk;

  const session = getSession();
  if (session) {
    logActivity({
      session,
      action: "payment_posted",
      category: "payments",
      entity: body?.loan_no ? { type: "loan", id: body.loan_no } : null,
      meta: { amount: body?.amount_recovered, payment_method: body?.payment_method, status: body?.globalStatus },
      success,
    });
  }

  return NextResponse.json({
    success,
    message: result.message ?? (httpOk ? "Payment submitted!" : "Submission failed"),
  });
}
