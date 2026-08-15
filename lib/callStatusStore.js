/**
 * lib/callStatusStore.js — reads the ConVox call-status events that
 * app/api/convox/call-status/route.js writes to local JSONL files
 * (data/call_status_logs/YYYY-MM-DD.jsonl) whenever the backend storage
 * API (CALL_STATUS_STORE_API_URL) isn't configured yet / a call to it fails.
 *
 * ⚠️ TEMPORARY: once the backend API is live and being used for storage,
 * this report should switch to reading FROM that same backend (via a
 * "list" endpoint they provide) instead of local files, so agents on
 * different server instances all see the same data. Until then, this is
 * the only place the data lives, so it's also the only place to read it
 * from — fine for a single-server deployment.
 */

import fs from "fs";
import path from "path";

const BASE_DIR = path.join(process.cwd(), "data", "call_status_logs");

/** Lists the daily .jsonl files, most recent first. */
function listDailyFiles() {
  try {
    return fs
      .readdirSync(BASE_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .reverse();
  } catch {
    return []; // directory doesn't exist yet — no events received so far
  }
}

/** Reads and parses every event across all daily files. Newest first. */
function readAllEvents() {
  const events = [];
  for (const file of listDailyFiles()) {
    let text = "";
    try {
      text = fs.readFileSync(path.join(BASE_DIR, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        /* skip a corrupt line rather than failing the whole report */
      }
    }
  }
  events.sort((a, b) => (b.received_at ?? 0) - (a.received_at ?? 0));
  return events;
}

/**
 * Returns a filtered + paginated slice of call-status events.
 * @param {object} opts { search, disposition, agent, from, to, page, limit }
 *   from/to are 'YYYY-MM-DD' strings compared against CALL_DATE (or received_at as fallback).
 */
export function queryCallStatusLogs(opts = {}) {
  const { search = "", disposition = "", agent = "", from = "", to = "", page = 1, limit = 25 } = opts;

  let rows = readAllEvents();

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.LEAD_ID, r.MOBILE_NO, r.CALL_REFERENCE_ID, r.USER_ID, r.LIST_ID]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }
  if (disposition.trim()) {
    rows = rows.filter((r) => String(r.DISPOSITION ?? "").toLowerCase() === disposition.trim().toLowerCase());
  }
  if (agent.trim()) {
    rows = rows.filter((r) => String(r.USER_ID ?? "").toLowerCase() === agent.trim().toLowerCase());
  }
  if (from) {
    const fromTs = new Date(from + "T00:00:00").getTime();
    rows = rows.filter((r) => {
      const d = r.CALL_DATE ? new Date(r.CALL_DATE).getTime() : (r.received_at ?? 0) * 1000;
      return !Number.isNaN(d) && d >= fromTs;
    });
  }
  if (to) {
    const toTs = new Date(to + "T23:59:59").getTime();
    rows = rows.filter((r) => {
      const d = r.CALL_DATE ? new Date(r.CALL_DATE).getTime() : (r.received_at ?? 0) * 1000;
      return !Number.isNaN(d) && d <= toTs;
    });
  }

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * limit;
  const pageRows = rows.slice(start, start + limit);

  // Summary counts for the top cards — computed over the FULL filtered set, not just this page.
  const summary = {
    total: totalItems,
    connected: rows.filter((r) => String(r.CALL_STATUS ?? "").toLowerCase() === "completed").length,
    missed: rows.filter((r) => ["missed", "failed"].includes(String(r.CALL_STATUS ?? "").toLowerCase())).length,
    totalDurationSec: rows.reduce((sum, r) => sum + (parseInt(r.CALL_DURATION, 10) || 0), 0),
  };

  return { rows: pageRows, pagination: { currentPage, totalPages, totalItems }, summary };
}

/** Distinct dispositions/agents seen so far — used to populate filter dropdowns. */
export function listCallStatusFacets() {
  const rows = readAllEvents();
  const dispositions = new Set();
  const agents = new Set();
  for (const r of rows) {
    if (r.DISPOSITION) dispositions.add(String(r.DISPOSITION));
    if (r.USER_ID) agents.add(String(r.USER_ID));
  }
  return { dispositions: [...dispositions].sort(), agents: [...agents].sort() };
}
