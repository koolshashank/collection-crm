import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerUrl } from "@/lib/apiConfig";
import { bucketKeyFor, ALL_BUCKET_KEYS } from "@/lib/dpdBuckets";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/vintage-analysis — ADMIN only.
 *
 * There is no vintage/roll-rate endpoint upstream, so this pulls the
 * ENTIRE portfolio (paginating portfolio/getLoanList1/portfolio, the same
 * upstream /api/leads/list proxies) and cross-tabs each loan's origination
 * month (disbursal_date_ist) against its current DPD bucket. Modeled on
 * the full-pagination pull in app/api/collection/export/route.js and
 * app/api/assign/round-robin/route.js, but fetches pages in small
 * concurrent batches once totalPages is known — this is a heavier
 * "generate a report" pull (portfolio could be tens of thousands of rows)
 * so a strictly sequential loop would be too slow for a page load.
 *
 * A module-level in-memory cache (same shape as the Dootiq token cache in
 * app/api/dashboard/whatsapp-analytics/route.js, adapted to an elapsed-time
 * TTL) avoids re-running the full pull on every page view. ?refresh=true
 * bypasses it.
 */

const PAGE_LIMIT = 200; // rows per upstream call — minimise round-trips
const MAX_PAGES = 250; // safety cap: 250 × 200 = up to 50,000 rows
const BATCH_SIZE = 6; // concurrent page requests once totalPages is known
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 min
const RECENT_COHORT_MONTHS = 24; // cohorts older than this are rolled into "older"

const DISBURSAL_DATE_KEYS = ["disbursal_date_ist", "disbursement_date", "loan_disbursement_date", "sanction_date"];
const AMOUNT_KEYS = ["sanction_amount", "loan_amount", "sanctioned_amount"];

let cache = null; // { data, computedAtMs }

function pick(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function cohortKeyFor(row) {
  const raw = pick(row, DISBURSAL_DATE_KEYS);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function cohortLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function emptyBucketMap() {
  const m = {};
  for (const k of ALL_BUCKET_KEYS) m[k] = { count: 0, amount: 0 };
  return m;
}

async function fetchPage(jwt, page) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  const res = await rawGet(paytrackerUrl(`portfolio/getLoanList1/portfolio?${params.toString()}`), {
    headers: { Accept: "application/json", Authorization: `Bearer ${jwt}` },
    timeoutMs: 15000,
  });
  const body = res.data && typeof res.data === "object" ? res.data : null;
  // res.ok is the HTTP-level success flag — a non-2xx response (e.g. an
  // expired-token error) still parses as valid JSON, so checking "did it
  // parse" alone would silently read an auth failure as "0 loans".
  const ok = !res.error && res.ok && Array.isArray(body?.leads);
  return {
    ok,
    error: res.error || (!ok ? body?.message || `Upstream returned HTTP ${res.status}` : null),
    leads: ok ? body.leads : [],
    totalPages: parseInt(body?.pagination?.totalPages, 10) || 1,
    totalItems: parseInt(body?.pagination?.totalItems, 10) || 0,
  };
}

async function computeVintage(jwt) {
  const cohorts = new Map(); // monthKey|"unknown-cohort" -> bucketMap
  let totalLoans = 0;
  let pagesScanned = 0;
  let truncated = false;
  let message = null;

  function ingest(rows) {
    for (const row of rows) {
      const monthKey = cohortKeyFor(row) ?? "unknown-cohort";
      if (!cohorts.has(monthKey)) cohorts.set(monthKey, emptyBucketMap());
      const bucketKey = bucketKeyFor(row?.dpd);
      const amount = Number(pick(row, AMOUNT_KEYS)) || 0;
      const cell = cohorts.get(monthKey)[bucketKey];
      cell.count += 1;
      cell.amount += amount;
      totalLoans += 1;
    }
  }

  const first = await fetchPage(jwt, 1);
  pagesScanned = 1;
  if (!first.ok) {
    return { cohorts, totalLoans, pagesScanned, truncated: true, message: first.error || "Could not reach the portfolio API." };
  }
  ingest(first.leads);

  const totalPages = Math.min(first.totalPages, MAX_PAGES);
  if (first.totalPages > MAX_PAGES) truncated = true;

  let page = 2;
  while (page <= totalPages) {
    const batchPages = [];
    for (let i = 0; i < BATCH_SIZE && page <= totalPages; i++, page++) batchPages.push(page);

    const results = await Promise.all(batchPages.map((p) => fetchPage(jwt, p)));
    pagesScanned += results.length;

    let batchFailed = false;
    for (const r of results) {
      if (r.ok) {
        ingest(r.leads);
      } else {
        batchFailed = true;
        message = message || r.error || "One or more pages could not be fetched.";
      }
    }
    if (batchFailed) {
      truncated = true;
      break; // stop rather than risk an incomplete/skewed picture from a flaky upstream
    }
  }

  return { cohorts, totalLoans, pagesScanned, truncated, message };
}

export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(session.roles ?? []).includes("ADMIN")) {
    return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
  }

  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "true";
  if (!forceRefresh && cache && Date.now() - cache.computedAtMs < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const result = await computeVintage(session.jwt_token);

  // Sort cohorts most-recent-first; roll anything older than the most
  // recent RECENT_COHORT_MONTHS into a single "older" row. "unknown-cohort"
  // is kept as its own row always (never merged — it isn't "old", it's unparseable).
  const realCohortKeys = [...result.cohorts.keys()].filter((k) => k !== "unknown-cohort").sort().reverse();
  const recentKeys = realCohortKeys.slice(0, RECENT_COHORT_MONTHS);
  const olderKeys = realCohortKeys.slice(RECENT_COHORT_MONTHS);

  const cohortRows = recentKeys.map((monthKey) => {
    const buckets = result.cohorts.get(monthKey);
    const totalCount = Object.values(buckets).reduce((s, b) => s + b.count, 0);
    const totalAmount = Object.values(buckets).reduce((s, b) => s + b.amount, 0);
    return { month: monthKey, label: cohortLabel(monthKey), totalCount, totalAmount, buckets };
  });

  if (olderKeys.length) {
    const merged = emptyBucketMap();
    for (const k of olderKeys) {
      const buckets = result.cohorts.get(k);
      for (const bk of ALL_BUCKET_KEYS) {
        merged[bk].count += buckets[bk].count;
        merged[bk].amount += buckets[bk].amount;
      }
    }
    const totalCount = Object.values(merged).reduce((s, b) => s + b.count, 0);
    const totalAmount = Object.values(merged).reduce((s, b) => s + b.amount, 0);
    cohortRows.push({ month: "older", label: `Older than ${RECENT_COHORT_MONTHS} months`, totalCount, totalAmount, buckets: merged });
  }

  if (result.cohorts.has("unknown-cohort")) {
    const buckets = result.cohorts.get("unknown-cohort");
    const totalCount = Object.values(buckets).reduce((s, b) => s + b.count, 0);
    const totalAmount = Object.values(buckets).reduce((s, b) => s + b.amount, 0);
    cohortRows.push({ month: "unknown-cohort", label: "Unknown Origination Date", totalCount, totalAmount, buckets });
  }

  const data = {
    success: true,
    computedAt: new Date().toISOString(),
    totalLoans: result.totalLoans,
    pagesScanned: result.pagesScanned,
    truncated: result.truncated,
    message: result.message,
    cohorts: cohortRows,
  };

  cache = { data, computedAtMs: Date.now() };
  return NextResponse.json(data);
}
