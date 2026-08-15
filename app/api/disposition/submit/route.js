import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerDevUrl } from "@/lib/apiConfig";

/**
 * GET /api/disposition/summary
 * Returns [{ code, label, count }] for the cards on the Disposition page.
 *
 * ⚠️ HOW THE CODE LIST IS BUILT — worth knowing, because it has a real limit:
 * the upstream API has no "list all disposition codes" endpoint, so this
 * DISCOVERS the codes from a sample page and collects the distinct
 * disposition_code values it sees. Codes absent from the sample get no card.
 *
 * If the team can give us the fixed list of codes, set DISPOSITION_CODES in
 * .env.local (comma-separated, e.g. "PTP,RTP,CB,WN,NC") — discovery is then
 * skipped entirely, which is the reliable option.
 *
 * Counts are always accurate: each code is queried with ?disposition_code=X
 * and the number comes from the API's own pagination total.
 */

// Tried in order — some APIs cap page size and 400 on anything larger.
const SAMPLE_LIMITS = [200, 100, 50];

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

/** Returns { body } on success, or { error, status } describing what went wrong. */
async function fetchPage(token, params) {
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

export async function GET() {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = session.jwt_token;

    /* ── Step 1: which codes to show ── */
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
        const r = await fetchPage(token, new URLSearchParams({ page: "1", limit: String(limit) }));
        if (r.body) {
          sample = r.body;
          break;
        }
        lastError = r.error;
        console.error(`[disposition/summary] sample limit=${limit} failed: ${r.error} (${r.url})`);
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
            "Check the field name in the response and update the key list, or set DISPOSITION_CODES.",
        });
      }
    }

    /* ── Step 2: accurate count per code ── */
    const cards = [];
    for (const code of codes) {
      const r = await fetchPage(
        token,
        new URLSearchParams({ page: "1", limit: "1", disposition_code: code })
      );
      if (!r.body) {
        console.error(`[disposition/summary] count for ${code} failed: ${r.error}`);
        cards.push({ code, label: labelByCode[code] || code, count: 0, error: true });
        continue;
      }
      const rows = extractRows(r.body);
      cards.push({
        code,
        label:
          labelByCode[code] ||
          pick(rows[0] || {}, ["disposition_label", "dispositionLabel"]) ||
          code,
        count: extractTotal(r.body, rows),
      });
    }

    cards.sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, cards, discovered: configured.length === 0 });
  } catch (err) {
    console.error("[disposition/summary] unexpected error:", err);
    return NextResponse.json(
      { success: false, message: `Server error: ${err?.message || "unknown"}`, cards: [] },
      { status: 500 }
    );
  }
}