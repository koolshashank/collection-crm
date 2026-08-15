import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { loansphereUrl } from "@/lib/apiConfig";

/**
 * GET /api/logs?lead_id=…
 * Port of get_logs.php — proxies the LoanSphere lead-logs API
 * (note the different backend host: api.blinkrloan.com).
 * Response shape: { data: [], message } or { data: [], error }.
 */
export async function GET(request) {
  try {
    const leadId = (new URL(request.url).searchParams.get("lead_id") || "").trim();
    const token = getSession()?.jwt_token || "";

    if (!leadId) return NextResponse.json({ data: [], error: "lead_id missing" });
    if (!token) return NextResponse.json({ data: [], error: "Unauthorized" });

    const res = await rawGet(
      loansphereUrl(`lead/lead-logs/${leadId}`),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 15000,
      }
    );

    if (res.error) {
      return NextResponse.json({ data: [], error: `Connection error: ${res.error}` });
    }

    const result = res.data;
    if (result === null || typeof result !== "object") {
      return NextResponse.json({ data: [], error: "Invalid response from server" });
    }

    return NextResponse.json({
      data: result.data ?? [],
      message: result.message ?? "ok",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
