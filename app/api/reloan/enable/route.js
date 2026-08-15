import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/reloan/enable?pan=…
 * Port of enable_reloan.php — proxies collection/enable_reloan_dpd/{pan}.
 *
 * PHP behaviour preserved 1:1:
 * - 400-style "PAN or token missing" if pan or session token absent.
 * - Bearer token auth, 15s timeout.
 * - success = result.success truthy (strict — no httpOk fallback, matches PHP).
 * - message = result.message, else "Done".
 */
export async function GET(request) {
  const pan = (new URL(request.url).searchParams.get("pan") || "").trim();
  const session = getSession();
  const token = session?.jwt_token || "";

  if (!pan || !token) {
    return NextResponse.json({ success: false, message: "PAN or token missing" });
  }

  const res = await rawGet(
    apiUrl(`collection/enable_reloan_dpd/${pan}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeoutMs: 15000,
    }
  );

  if (res.error) {
    return NextResponse.json({ success: false, message: `Connection error: ${res.error}` });
  }

  const result = res.data !== null && typeof res.data === "object" ? res.data : null;
  if (result === null) {
    return NextResponse.json({ success: false, message: "Invalid response from server" });
  }

  logActivity({
    session,
    action: "reloan_enabled",
    category: "other",
    entity: { type: "pan", id: pan },
    success: Boolean(result.success),
  });

  return NextResponse.json({
    success: Boolean(result.success),
    message: result.message ?? "Done",
  });
}
