import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";

/**
 * GET /api/payments/fetch?leadId=…
 * Port of fetch_payment.php — proxies collection/getPaymentList/{leadId}.
 * Response shape: { data: [...] } or { data: [], message }.
 */
export async function GET(request) {
  try {
    const raw = new URL(request.url).searchParams.get("leadId");
    if (!raw) {
      return NextResponse.json({ data: [], message: "leadId required" });
    }

    const leadId = raw.trim();
    const token = getSession()?.jwt_token || "";
    if (!token) {
      return NextResponse.json({ data: [], message: "Unauthorized" });
    }

    const res = await rawGet(
      apiUrl(`collection/getPaymentList/${leadId}`),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 15000,
      }
    );

    if (res.error) {
      return NextResponse.json({ data: [], message: "Connection error" });
    }

    const result =
      res.data !== null && typeof res.data === "object" ? res.data : {};
    let data = result.data ?? [];
    if (!Array.isArray(data)) data = [data];

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
