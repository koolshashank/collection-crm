import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiPost } from "@/lib/serverApi";

/**
 * Portfolio Dashboard summary cards — port of the second server-side curl in
 * lead.php: POST https://backend.blinkrloan.com/api/collection/portfolio-dashboard
 * with Bearer token (15s timeout).
 */
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const res = await apiPost("collection/portfolio-dashboard", {}, { timeoutMs: 15000 });

    if (res.error) {
      return NextResponse.json({ success: false, message: res.error }, { status: 502 });
    }

    // Same consumption as lead.php: $pfDecoded['data'] ?? $pfDecoded ?? []
    const decoded = typeof res.data === "object" && res.data !== null ? res.data : {};
    const dashboard = decoded.data ?? decoded ?? {};
    return NextResponse.json({ success: true, data: dashboard }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
