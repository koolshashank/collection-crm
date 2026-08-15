/**
 * lib/auditLog.js — project-wide employee activity trail.
 * Append-only JSONL, partitioned by month: data/audit/{YYYY-MM}.jsonl.
 * Mirrors the append/read technique in lib/trackerDb.js, but as an
 * independent store (that file's materialize() is hardcoded to
 * session/break events and isn't a generic audit log).
 */

import fs from "fs";
import path from "path";

const AUDIT_DIR = path.join(process.cwd(), "data", "audit");

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fileForMonth(key) {
  return path.join(AUDIT_DIR, `${key}.jsonl`);
}

/** Every month key from `from` to `to` inclusive (defaults: last 3 months → now). */
function monthKeysInRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();
  const keys = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function readMonthFile(key) {
  const file = fileForMonth(key);
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Records one activity entry. Never throws — audit logging must not break
 * the action it's observing.
 */
export function logActivity({ session, action, category = "other", entity = null, meta = {}, success = true }) {
  try {
    const ts = new Date().toISOString();
    const entry = {
      ts,
      actor: {
        user_id: session?.user_id ?? null,
        username: session?.username ?? null,
        name: session?.name ?? null,
        roles: session?.roles ?? [],
      },
      action,
      category,
      entity,
      meta,
      success: Boolean(success),
    };
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
    fs.appendFileSync(fileForMonth(monthKey(new Date(ts))), JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}

/**
 * Filters + paginates audit entries across the month-partitions that
 * overlap [from, to]. Defaults to the last 90 days if no range is given.
 */
export function queryAuditLog({ employeeId, action, category, from, to, page = 1, limit = 50 } = {}) {
  const keys = monthKeysInRange(from, to);
  let entries = keys.flatMap(readMonthFile);

  if (employeeId) entries = entries.filter((e) => String(e.actor?.user_id) === String(employeeId));
  if (action) entries = entries.filter((e) => e.action === action);
  if (category) entries = entries.filter((e) => e.category === category);
  if (from) entries = entries.filter((e) => e.ts >= new Date(from).toISOString());
  if (to) entries = entries.filter((e) => e.ts <= new Date(to).toISOString());

  entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const total = entries.length;
  const start = (Math.max(1, page) - 1) * limit;
  const pageEntries = entries.slice(start, start + limit);

  return { total, page: Math.max(1, page), limit, entries: pageEntries };
}

/** Distinct actors seen in the current + previous month, for filter dropdowns. */
export function listRecentActors() {
  const keys = monthKeysInRange(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), new Date());
  const entries = keys.flatMap(readMonthFile);
  const byId = new Map();
  for (const e of entries) {
    const id = e.actor?.user_id;
    if (id != null && !byId.has(id)) {
      byId.set(id, { user_id: id, name: e.actor?.name ?? String(id) });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}
