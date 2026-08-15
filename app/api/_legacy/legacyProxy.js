import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Proxy helper for legacy PHP endpoints whose source was NOT included in the
 * migration bundle (get_lead_pan.php, loan_history_proxy.php, assign_field.php,
 * submit_remarks.php, ...).
 *
 * When LEGACY_PHP_BASE_URL is set (e.g. https://crm.blinkrloan.com) the request
 * is forwarded 1:1 (same method, same query string, same JSON body) to
 * `${LEGACY_PHP_BASE_URL}/<file>.php`. Otherwise a 501 JSON response is returned.
 */
export async function proxyLegacy(request, phpFile, { timeoutMs = 20000 } = {}) {
  const base = process.env.LEGACY_PHP_BASE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, message: `${phpFile} was not included in the migration bundle` },
      { status: 501 }
    );
  }

  try {
    const incoming = new URL(request.url);
    const target = `${base.replace(/\/+$/, "")}/${phpFile}${incoming.search}`;

    const session = getSession();
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (session?.jwt_token) headers["Authorization"] = `Bearer ${session.jwt_token}`;

    const init = { method: request.method, headers, cache: "no-store" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      headers["Content-Type"] = request.headers.get("content-type") || "application/json";
      init.body = await request.text();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    init.signal = controller.signal;

    let res;
    try {
      res = await fetch(target, init);
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { success: false, message: "Legacy endpoint returned a non-JSON response" };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return NextResponse.json(
      { success: false, message: aborted ? "Request timed out" : "Could not reach legacy endpoint" },
      { status: 502 }
    );
  }
}
