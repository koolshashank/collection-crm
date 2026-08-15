import { NextResponse } from "next/server";

/**
 * Legacy PHP proxy — for endpoints whose PHP source was NOT included in the
 * migration bundle (process_assign.php, bulkAssignProcess.php, …).
 *
 * If LEGACY_PHP_BASE_URL is set, the incoming request body is forwarded
 * UNCHANGED (same content-type, same multipart/urlencoded payload) to
 * `${LEGACY_PHP_BASE_URL}/<file>.php` and the PHP response is relayed back.
 * Otherwise responds 501 so the UI can surface a clear message.
 */
export async function forwardLegacyPost(request, phpFile) {
  const base = process.env.LEGACY_PHP_BASE_URL;
  if (!base) {
    // TODO(legacy): source of `phpFile` was not in the migration bundle —
    // set LEGACY_PHP_BASE_URL to proxy to the old PHP app until it is ported.
    return NextResponse.json(
      { success: false, message: `${phpFile} was not included in the migration bundle` },
      { status: 501 }
    );
  }

  try {
    const { search } = new URL(request.url);
    const url = `${base.replace(/\/+$/, "")}/${phpFile}${search || ""}`;
    const contentType = request.headers.get("content-type") || "";
    const body = Buffer.from(await request.arrayBuffer());

    const res = await fetch(url, {
      method: "POST",
      headers: contentType ? { "content-type": contentType } : {},
      body,
      cache: "no-store",
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: res.ok };
    } catch {
      data = { success: res.ok, message: (text || "").slice(0, 500) };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err?.message || "Could not reach the legacy PHP server" },
      { status: 502 }
    );
  }
}

/** Same pattern for GET (query string forwarded unchanged). */
export async function forwardLegacyGet(request, phpFile) {
  const base = process.env.LEGACY_PHP_BASE_URL;
  if (!base) {
    // TODO(legacy)
    return NextResponse.json(
      { success: false, message: `${phpFile} was not included in the migration bundle` },
      { status: 501 }
    );
  }
  try {
    const { search } = new URL(request.url);
    const url = `${base.replace(/\/+$/, "")}/${phpFile}${search || ""}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: res.ok };
    } catch {
      data = { success: res.ok, message: (text || "").slice(0, 500) };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err?.message || "Could not reach the legacy PHP server" },
      { status: 502 }
    );
  }
}
