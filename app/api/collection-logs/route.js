import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";

/**
 * GET /api/collection-logs?leadId=…
 * Port of getCollectionLogs.php — proxies collection/getCollectionLogs/{leadId}.
 * Response shape: { data: [], message } or { data: [], error }.
 */
export async function GET(request) {
  try {
    const leadId = (new URL(request.url).searchParams.get("leadId") || "").trim();
    const token = getSession()?.jwt_token || "";

    if (!leadId) return NextResponse.json({ data: [], error: "leadId missing" });
    if (!token) return NextResponse.json({ data: [], error: "Unauthorized" });

    const res = await rawGet(
      apiUrl(`collection/getCollectionLogs/${leadId}`),
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
      return NextResponse.json({ data: [], error: "Invalid JSON from server" });
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
