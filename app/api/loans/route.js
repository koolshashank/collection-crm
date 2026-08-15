import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl as buildApiUrl } from "@/lib/apiConfig";

/**
 * GET /api/loans?emp_id=…&page=…&limit=…
 * Port of get_loans.php — proxies collection/getLoanListByEmp/{emp_id}.
 * NOTE (matches PHP exactly): upstream auth is sent as a Cookie
 * ("employee_jwt=<jwt>"), NOT as a Bearer header. Error bodies and their
 * shapes ({error: …}) are byte-compatible with the PHP proxy (HTTP 200).
 */
export async function GET(request) {
  try {
    /* ── Auth guard ── */
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ error: "unauthorized" });
    }

    /* ── Validate emp_id ── */
    const { searchParams } = new URL(request.url);
    const empRaw = searchParams.get("emp_id");
    if (empRaw === null || empRaw.trim() === "") {
      return NextResponse.json({ error: "emp_id missing" });
    }

    const emp_id = parseInt(empRaw, 10) || 0; // PHP (int) cast
    const page = searchParams.has("page")
      ? Math.max(parseInt(searchParams.get("page"), 10) || 0, 1)
      : 1;
    const limit = searchParams.has("limit")
      ? Math.max(parseInt(searchParams.get("limit"), 10) || 0, 1)
      : 10;

    /* ── Build API URL (same as PHP) ── */
    const apiUrl = buildApiUrl(`collection/getLoanListByEmp/${emp_id}`, "", { page, limit });

    const res = await rawGet(apiUrl, {
      headers: {
        Cookie: `employee_jwt=${session.jwt_token}`,
        Accept: "application/json",
      },
      timeoutMs: 20000,
    });

    /* ── Connection error ── */
    if (res.error) {
      return NextResponse.json({ error: "Connection failed: " + res.error });
    }

    /* ── Non-JSON / empty response ── */
    if (res.data === null || res.data === "") {
      return NextResponse.json({ error: "Empty response from server", http_code: res.status });
    }
    if (typeof res.data === "string") {
      return NextResponse.json({ error: "Invalid JSON from upstream", http_code: res.status });
    }

    /* ── Forward response ── */
    return NextResponse.json(res.data);
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
