import fs from "fs";
import path from "path";

/**
 * lib/trackerDb.js — port of tracker_db.php
 * ─────────────────────────────────────────────────────────────────────
 * STORAGE SWAP (documented per conversion spec):
 * The PHP original used SQLite (includes `data/tracker.sqlite`, tables
 * `tracker_sessions` + `tracker_breaks`). To avoid native sqlite deps in
 * Node, this is reimplemented as an APPEND-ONLY JSON-LINES event log at
 * PROJECT_ROOT/data/tracker.jsonl. Every mutation is appended as one JSON
 * line; reads replay the log to materialize current state. The recorded
 * fields are IDENTICAL to the SQLite columns:
 *
 *   tracker_sessions: id, user_id, user_name, role, login_time, last_ping,
 *                     logout_time, duration_sec, inactive_sec,
 *                     logout_type (manual | auto | null), ip, user_agent
 *   tracker_breaks:   id, session_id, break_type (lunch|tea|personal|meeting|break),
 *                     start_time, end_time
 *
 * Event line shapes:
 *   { t:"session",   op:"insert", row:{...} }
 *   { t:"session",   op:"update", id, set:{...} }
 *   { t:"break",     op:"insert", row:{...} }
 *   { t:"break",     op:"close_open", session_id, end_time }   // = UPDATE ... WHERE end_time IS NULL
 *   { t:"noc_track", ... }                                     // public NOC link/pixel tracker events
 *
 * Like the PHP (`trackerDb()` returns null, never throws), every function
 * here fails soft — callers can always respond 200.
 */

const DATA_FILE = path.join(process.cwd(), "data", "tracker.jsonl");

/** PHP date('Y-m-d H:i:s') equivalent (server-local time). */
export function trackerNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** PHP date('Y-m-d') equivalent. */
export function trackerToday() {
  return trackerNow().slice(0, 10);
}

function appendLine(obj) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.appendFileSync(DATA_FILE, JSON.stringify(obj) + "\n", "utf8");
    return true;
  } catch (err) {
    // Mirrors error_log('[tracker_db] ...') — swallow, fail soft.
    console.error("[tracker_db] append failed:", err?.message);
    return false;
  }
}

function readLines() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return fs
      .readFileSync(DATA_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null; // skip corrupt lines — append-safe store must never crash reads
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.error("[tracker_db] read failed:", err?.message);
    return [];
  }
}

/** Replays the event log into current state — same query surface as the SQLite tables. */
function materialize() {
  const sessions = new Map(); // id -> row
  const breaks = new Map(); // id -> row
  for (const rec of readLines()) {
    try {
      if (rec.t === "session" && rec.op === "insert" && rec.row) {
        sessions.set(rec.row.id, { ...rec.row });
      } else if (rec.t === "session" && rec.op === "update" && sessions.has(rec.id)) {
        Object.assign(sessions.get(rec.id), rec.set || {});
      } else if (rec.t === "break" && rec.op === "insert" && rec.row) {
        breaks.set(rec.row.id, { ...rec.row });
      } else if (rec.t === "break" && rec.op === "close_open") {
        for (const b of breaks.values()) {
          if (b.session_id === rec.session_id && (b.end_time === null || b.end_time === undefined)) {
            b.end_time = rec.end_time;
          }
        }
      }
      // noc_track events are write-only for the endpoints; ignored here.
    } catch {
      /* fail soft */
    }
  }
  return { sessions, breaks };
}

function nextId(map) {
  let max = 0;
  for (const id of map.keys()) if (Number(id) > max) max = Number(id);
  return max + 1;
}

/* ── Queries mirroring tracking_ping.php's SQL ── */

/** SELECT id FROM tracker_sessions WHERE user_id=? AND DATE(login_time)=? AND logout_time IS NULL LIMIT 1 */
export function findOpenSessionForDay(userId, dateStr) {
  const { sessions } = materialize();
  for (const s of sessions.values()) {
    if (
      Number(s.user_id) === Number(userId) &&
      String(s.login_time || "").slice(0, 10) === dateStr &&
      (s.logout_time === null || s.logout_time === undefined)
    ) {
      return s.id;
    }
  }
  return null;
}

/** INSERT INTO tracker_sessions (...) — returns new id. */
export function insertSession({ user_id, user_name, role, login_time, last_ping, ip, user_agent }) {
  const { sessions } = materialize();
  const id = nextId(sessions);
  const row = {
    id,
    user_id,
    user_name,
    role,
    login_time,
    last_ping,
    logout_time: null,
    duration_sec: 0,
    inactive_sec: 0,
    logout_type: null,
    ip,
    user_agent,
  };
  appendLine({ t: "session", op: "insert", row });
  return id;
}

/** UPDATE tracker_sessions SET last_ping=? WHERE id=? AND logout_time IS NULL */
export function touchSession(id, lastPing) {
  const { sessions } = materialize();
  const s = sessions.get(id);
  if (!s || s.logout_time) return false;
  return appendLine({ t: "session", op: "update", id, set: { last_ping: lastPing } });
}

/** UPDATE tracker_sessions SET logout_time=?, duration_sec=?, inactive_sec=?, logout_type=? WHERE id=? */
export function closeSession(id, { logout_time, duration_sec, inactive_sec, logout_type }) {
  return appendLine({
    t: "session",
    op: "update",
    id,
    set: { logout_time, duration_sec, inactive_sec, logout_type },
  });
}

/** SELECT * FROM tracker_sessions WHERE id=? */
export function getSessionById(id) {
  const { sessions } = materialize();
  return sessions.get(id) || null;
}

/** UPDATE tracker_breaks SET end_time=? WHERE session_id=? AND end_time IS NULL */
export function closeOpenBreaks(sessionId, endTime) {
  return appendLine({ t: "break", op: "close_open", session_id: sessionId, end_time: endTime });
}

/** INSERT INTO tracker_breaks (session_id, break_type, start_time) — returns new id. */
export function insertBreak(sessionId, breakType, startTime) {
  const { breaks } = materialize();
  const id = nextId(breaks);
  const row = { id, session_id: sessionId, break_type: breakType, start_time: startTime, end_time: null };
  appendLine({ t: "break", op: "insert", row });
  return id;
}

/** SELECT * FROM tracker_breaks WHERE session_id=? AND end_time IS NULL ORDER BY id DESC LIMIT 1 */
export function getActiveBreak(sessionId) {
  const { breaks } = materialize();
  let latest = null;
  for (const b of breaks.values()) {
    if (b.session_id === sessionId && (b.end_time === null || b.end_time === undefined)) {
      if (!latest || b.id > latest.id) latest = b;
    }
  }
  return latest;
}

/** SELECT COALESCE(SUM((julianday(end_time)-julianday(start_time))*86400),0) ... end_time IS NOT NULL */
export function sumClosedBreakSec(sessionId) {
  const { breaks } = materialize();
  let total = 0;
  for (const b of breaks.values()) {
    if (b.session_id === sessionId && b.end_time) {
      const start = new Date(String(b.start_time).replace(" ", "T"));
      const end = new Date(String(b.end_time).replace(" ", "T"));
      const sec = Math.floor((end - start) / 1000);
      if (Number.isFinite(sec) && sec > 0) total += sec;
    }
  }
  return total;
}

/** Append a public NOC link/pixel tracker event (used by /api/noc/track). Never throws. */
export function recordNocTrackEvent(fields) {
  return appendLine({ t: "noc_track", ...fields, created_at: trackerNow() });
}
