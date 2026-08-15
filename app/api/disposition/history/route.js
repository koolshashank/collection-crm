import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerDevUrl } from "@/lib/apiConfig";

/**
 * GET /api/disposition/history
 *
 * Two modes, both on this one route:
 *   (default)        → paginated records; params: page, limit, search, disposition_code
 *   ?mode=summary    → [{ code, label, count }] for the cards on the page
 *
 * The summary lives here rather than in its own route file purely for
 * deployment simplicity — one fewer file to place correctly.
 *
 * ⚠️ CODE DISCOVERY: the upstream API has no "list all disposition codes"
 * endpoint, so summary mode samples a page of records and collects the
 * distinct disposition_code values it sees. A code absent from that sample
 * gets no card. Set DISPOSITION_CODES in .env.local (comma-separated,
 * e.g. "PTP,RNR,FPTP") to skip discovery and use a fixed list instead.
 * Counts themselves are always exact — each code is queried directly and
 * the number comes from the API's own pagination total.
 */

const SAMPLE_LIMITS = [200, 100, 50]; // tried in order; some APIs cap page size

function extractRows(body) {
  return (
    [body.data, body.result, body.rows, body.dispositions, body.history, body.records].find(Array.isArray) ||
    (Array.isArray(body) ? body : [])
  );
}

function extractTotal(body, rows) {
  const pg = body.pagination ?? body.meta ?? body;
  return Number(pg.totalItems ?? pg.total ?? pg.totalRecords ?? pg.count ?? 0) || rows.length;
}

function pick(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/** Returns { body } on success, or { error, status, url } describing the failure. */
async function fetchUpstream(token, params) {
  const url = paytrackerDevUrl(`portfolio/disposition-history?${params.toString()}`);
  const res = await rawGet(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      Cookie: `employee_jwt=${token}`,
    },
    timeoutMs: 20000,
  });

  if (res.error) return { error: `network: ${res.error}`, status: 0, url };
  if (!res.ok) {
    const detail =
      res.data && typeof res.data === "object"
        ? res.data.message || JSON.stringify(res.data).slice(0, 200)
        : String(res.data ?? "").slice(0, 200);
    return { error: `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`, status: res.status, url };
  }
  if (res.data === null || typeof res.data !== "object") {
    return { error: "upstream returned a non-JSON body", status: res.status, url };
  }
  return { body: res.data };
}

/* ── Summary mode ── */
async function handleSummary(token) {
  let codes = [];
  const labelByCode = {};

  const configured = (process.env.DISPOSITION_CODES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (configured.length) {
    codes = configured;
  } else {
    let sample = null;
    let lastError = "no attempt made";

    for (const limit of SAMPLE_LIMITS) {
      const r = await fetchUpstream(token, new URLSearchParams({ page: "1", limit: String(limit) }));
      if (r.body) {
        sample = r.body;
        break;
      }
      lastError = r.error;
      console.error(`[disposition summary] sample limit=${limit} failed: ${r.error}`);
    }

    if (!sample) {
      return NextResponse.json(
        { success: false, message: `Disposition API call failed — ${lastError}`, cards: [] },
        { status: 502 }
      );
    }

    for (const row of extractRows(sample)) {
      const code = pick(row, ["disposition_code", "dispositionCode"]);
      if (!code) continue;
      const key = String(code);
      if (!codes.includes(key)) codes.push(key);
      if (!labelByCode[key]) {
        const label = pick(row, ["disposition_label", "dispositionLabel", "display"]);
        if (label) labelByCode[key] = String(label);
      }
    }
    codes.sort();

    if (codes.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        note:
          "The API responded, but no disposition_code field was found on any row. " +
          "Check the field name and update the key list, or set DISPOSITION_CODES.",
      });
    }
  }

  const cards = [];
  for (const code of codes) {
    const r = await fetchUpstream(
      token,
      new URLSearchParams({ page: "1", limit: "1", disposition_code: code })
    );
    if (!r.body) {
      console.error(`[disposition summary] count for ${code} failed: ${r.error}`);
      cards.push({ code, label: labelByCode[code] || code, count: 0, error: true });
      continue;
    }
    const rows = extractRows(r.body);
    cards.push({
      code,
      label:
        labelByCode[code] || pick(rows[0] || {}, ["disposition_label", "dispositionLabel"]) || code,
      count: extractTotal(r.body, rows),
    });
  }

  cards.sort((a, b) => b.count - a.count);
  return NextResponse.json({ success: true, cards, discovered: configured.length === 0 });
}

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = session.jwt_token;
    const sp = new URL(request.url).searchParams;

    if (sp.get("mode") === "summary") {
      return await handleSummary(token);
    }

    /* ── List mode ── */
    const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get("limit") || "25", 10) || 25, 1);
    const search = (sp.get("search") || "").trim();
    const dispositionCode = (sp.get("disposition_code") || "").trim();

    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search_text", search);
    if (dispositionCode) params.set("disposition_code", dispositionCode);

    const r = await fetchUpstream(token, params);
    if (!r.body) {
      return NextResponse.json({ success: false, message: r.error, rows: [] }, { status: 502 });
    }

    const rows = extractRows(r.body);
    const totalItems = extractTotal(r.body, rows);
    const pg = r.body.pagination ?? r.body.meta ?? r.body;
    const totalPages =
      Number(pg.totalPages ?? pg.total_pages ?? 0) || Math.max(1, Math.ceil(totalItems / limit));

    return NextResponse.json({
      success: true,
      rows,
      pagination: { currentPage: page, limit, totalItems, totalPages },
    });
  } catch (err) {
    console.error("[disposition history] unexpected error:", err);
    return NextResponse.json(
      { success: false, message: `Server error: ${err?.message || "unknown"}` },
      { status: 500 }
    );
  }
}