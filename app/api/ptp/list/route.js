import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";

/**
 * GET /api/ptp/list?leadId=…
 * Port of get_ptp_list.php — proxies collection/getPtpList/{leadId}
 * and forwards the backend response verbatim.
 */
export async function GET(request) {
  try {
    const session = getSession();
    const token = session?.jwt_token || "";
    const leadId = (new URL(request.url).searchParams.get("leadId") || "").trim();

    if (!token || !leadId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const res = await rawGet(
      apiUrl(`collection/getPtpList/${leadId}`),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeoutMs: 15000,
      }
    );

    if (res.error) {
      return NextResponse.json({ data: [], error: "Connection error" });
    }

    // PHP echoes the upstream body verbatim (even if it is not valid JSON).
    if (res.data === null || typeof res.data === "string") {
      return new Response(res.data ?? "", {
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.json(res.data);
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
