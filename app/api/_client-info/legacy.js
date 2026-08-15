import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Legacy PHP proxy — used for endpoints whose PHP source was NOT included
 * in the migration bundle (submit_ptp.php, submit_disposition.php,
 * block_pan_action.php, enable_reloan.php, post-payment-api.php,
 * settlement_action.php non-get_emp_list actions).
 *
 * Behaviour:
 *  - If process.env.LEGACY_PHP_BASE_URL is set, the incoming request is
 *    forwarded UNCHANGED (method, query string, body, content-type) to
 *    `${LEGACY_PHP_BASE_URL}/<original>.php` and the response is relayed.
 *  - Otherwise responds 501 JSON so the UI degrades gracefully.
 */
export async function proxyLegacy(request, phpFile) {
  const base = process.env.LEGACY_PHP_BASE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, message: `${phpFile} was not included in the migration bundle` },
      { status: 501 }
    );
  }

  try {
    const incoming = new URL(request.url);
    const target = new URL(`${base.replace(/\/+$/, "")}/${phpFile}`);
    incoming.searchParams.forEach((v, k) => target.searchParams.append(k, v));

    const headers = { Accept: "application/json" };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    // The PHP scripts relied on the PHP session; pass the backend JWT the
    // same way client_info.php did for its own curl calls.
    const jwt = getSession()?.jwt_token;
    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
      headers["Cookie"] = `employee_jwt=${jwt}`;
    }

    const init = { method: request.method, headers, cache: "no-store" };
    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.text();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let res;
    try {
      res = await fetch(target.toString(), { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("content-type") || "text/plain; charset=utf-8" },
      });
    }
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: aborted
          ? "Legacy backend timed out"
          : `Legacy proxy error: ${err?.message || "network error"}`,
      },
      { status: 502 }
    );
  }
}
