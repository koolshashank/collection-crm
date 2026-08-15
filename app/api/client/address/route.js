import { NextResponse } from "next/server";
import { apiGet } from "@/lib/serverApi";

/**
 * GET /api/client/address?pan=…
 * Port of client_info.php step 2: GET {apiBase}/getAddress/{pan}.
 * Returns the upstream body unchanged (shape: { result: [...] }).
 */
export async function GET(request) {
  try {
    const pan = (new URL(request.url).searchParams.get("pan") || "").trim();
    if (!pan) {
      return NextResponse.json({ success: false, message: "PAN is required." }, { status: 400 });
    }
    const res = await apiGet("get_address", { suffix: encodeURIComponent(pan), timeoutMs: 12000 });
    if (res.error) {
      return NextResponse.json({ success: false, message: res.error }, { status: 502 });
    }
    return NextResponse.json(res.data ?? {}, { status: res.status || 200 });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load address." }, { status: 500 });
  }
}
