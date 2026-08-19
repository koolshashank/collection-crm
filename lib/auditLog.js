/**
 * lib/auditLog.js — project-wide employee activity trail.
 * Append-only JSONL, partitioned by month: data/audit/{YYYY-MM}.jsonl.
 * Mirrors the append/read technique in lib/trackerDb.js, but as an
 * independent store (that file's materialize() is hardcoded to
 * session/break events and isn't a generic audit log).
 */

import fs from "fs";
import path from "path";
import { headers } from "next/headers";
import { addNotification } from "./notifications";

const AUDIT_DIR = path.join(process.cwd(), "data", "audit");
const LAST_LOGIN_IP_FILE = path.join(process.cwd(), "data", "last_login_ip.json");

/**
 * Tracks each user's most recent login IP in a flat JSON map
 * ({ [user_id]: { ip, ts } }) so a fresh login can be compared against it.
 * Returns { isNewIp, previousIp } and updates the stored IP as a side
 * effect — never throws (fail-soft, same spirit as sessionEpoch.js).
 */
function checkAndUpdateLastLoginIp(userId, ip) {
  try {
    let store = {};
    if (fs.existsSync(LAST_LOGIN_IP_FILE)) {
      store = JSON.parse(fs.readFileSync(LAST_LOGIN_IP_FILE, "utf8")) || {};
    }
    const key = String(userId);
    const previous = store[key];
    const isNewIp = Boolean(previous?.ip && previous.ip !== ip);
    store[key] = { ip, ts: new Date().toISOString() };
    fs.mkdirSync(path.dirname(LAST_LOGIN_IP_FILE), { recursive: true });
    fs.writeFileSync(LAST_LOGIN_IP_FILE, JSON.stringify(store, null, 2));
    return { isNewIp, previousIp: previous?.ip ?? null };
  } catch {
    return { isNewIp: false, previousIp: null };
  }
}

/** Best-effort client IP from proxy headers — null if none is present
 *  (e.g. local dev behind no proxy). Never throws. */
function getRequestIp() {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

/**
 * Actions that mean someone is pulling customer data OUT of the CRM
 * (copy to clipboard, print, screenshot, …). Any non-admin doing one of
 * these fires a real-time alert to every connected admin — see
 * lib/notifications.js and app/api/notifications/stream/route.js.
 */
const SENSITIVE_ACTIONS = {
  copy_details: (name) => `${name} copied a customer's full loan summary`,
  print_page: (name) => `${name} printed a customer's page`,
  screenshot_captured: (name) => `${name} downloaded a screenshot of loan attributes`,
  token_copied: (name) => `${name} copied their own login/API token`,
  collection_export: (name, meta) => `${name} exported ${meta?.rows ?? "the"} rows from the Collection Report`,
};

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

/** Every month-partition file that exists on disk, regardless of date range. */
function listAllMonthKeys() {
  try {
    if (!fs.existsSync(AUDIT_DIR)) return [];
    return fs
      .readdirSync(AUDIT_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(/\.jsonl$/, ""));
  } catch {
    return [];
  }
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
    const ip = getRequestIp();
    let entryMeta = meta;
    if (action === "login" && success && session?.user_id != null && ip) {
      const { isNewIp, previousIp } = checkAndUpdateLastLoginIp(session.user_id, ip);
      if (isNewIp) entryMeta = { ...meta, new_ip: true, previous_ip: previousIp };
    }
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
      meta: entryMeta,
      success: Boolean(success),
      ip,
    };
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
    fs.appendFileSync(fileForMonth(monthKey(new Date(ts))), JSON.stringify(entry) + "\n");

    const describe = SENSITIVE_ACTIONS[action];
    if (describe && entry.success && !entry.actor.roles.includes("ADMIN")) {
      try {
        const who = entry.actor.name || entry.actor.username || "An employee";
        const where = entity?.id ? ` (Lead ${entity.id})` : "";
        addNotification({
          type: "sensitive_action",
          message: `${describe(who, meta)}${where}.`,
          actor: entry.actor,
          entity,
          meta,
        });
      } catch (err) {
        console.error("addNotification failed:", err);
      }
    }
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}

/**
 * Composes one lower-cased searchable string per entry — actor, action,
 * category, entity (e.g. a lead_id), and every meta value (loan numbers,
 * PANs, etc. often live here) — so a single free-text query can match
 * whichever field the admin actually typed.
 */
function searchableText(e) {
  return [
    e.actor?.name,
    e.actor?.username,
    e.actor?.user_id,
    e.action,
    e.category,
    e.entity?.type,
    e.entity?.id,
    JSON.stringify(e.meta ?? {}),
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(" | ")
    .toLowerCase();
}

/**
 * Filters + paginates audit entries across the month-partitions that
 * overlap [from, to]. Defaults to the last 90 days if no range is given —
 * UNLESS a free-text `search` is supplied with no explicit range, in which
 * case every month on disk is searched, so e.g. typing a lead_id surfaces
 * every time it was ever touched, not just the recent window.
 */
export function queryAuditLog({ employeeId, action, category, from, to, search, page = 1, limit = 50 } = {}) {
  const keys = search && !from && !to ? listAllMonthKeys() : monthKeysInRange(from, to);
  let entries = keys.flatMap(readMonthFile);

  if (employeeId) entries = entries.filter((e) => String(e.actor?.user_id) === String(employeeId));
  if (action) entries = entries.filter((e) => e.action === action);
  if (category) entries = entries.filter((e) => e.category === category);
  if (from) entries = entries.filter((e) => e.ts >= new Date(from).toISOString());
  if (to) entries = entries.filter((e) => e.ts <= new Date(to).toISOString());

  const q = String(search ?? "").trim().toLowerCase();
  if (q) entries = entries.filter((e) => searchableText(e).includes(q));

  entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const total = entries.length;
  const start = (Math.max(1, page) - 1) * limit;
  const pageEntries = entries.slice(start, start + limit);

  return { total, page: Math.max(1, page), limit, entries: pageEntries };
}

/**
 * All-time headline numbers for the Audit Log's stat cards. Scans every
 * month-partition on disk — fine at this app's scale (an internal admin
 * tool), and keeps every number here honest rather than approximated.
 */
export function getAuditStats() {
  const entries = listAllMonthKeys().flatMap(readMonthFile);
  const actorIds = new Set();
  const actions = new Set();
  const categories = new Set();
  const todayKey = new Date().toISOString().slice(0, 10);
  let todayCount = 0;

  for (const e of entries) {
    if (e.actor?.user_id != null) actorIds.add(String(e.actor.user_id));
    if (e.action) actions.add(e.action);
    if (e.category) categories.add(e.category);
    if (typeof e.ts === "string" && e.ts.slice(0, 10) === todayKey) todayCount++;
  }

  return {
    totalActivities: entries.length,
    activeEmployees: actorIds.size,
    actionTypes: actions.size,
    categoryTypes: categories.size,
    todayActivities: todayCount,
    todayIso: todayKey,
  };
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
