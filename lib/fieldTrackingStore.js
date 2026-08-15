/**
 * lib/fieldTrackingStore.js — clock-in/out sessions, location pings and
 * activity entries for field staff.
 *
 * ⚠️ NO BACKEND SOURCE EXISTS FOR ANY OF THIS YET. Live location, clock
 * in/out and route history all have to come from whatever the agents use
 * in the field (a mobile app, or a backend endpoint the app posts to).
 * Until that exists this store stays empty, so the tracking page will show
 * a real agent list (that part IS live, from collection/getEmpList) with
 * zeroed tracking numbers and "no data" states — the shape is right, the
 * feed is missing.
 *
 * When the backend is ready, either point these functions at it, or have
 * it POST into the write helpers below and keep the local file as a cache.
 * The API route and UI won't need changes either way.
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "field_tracking.json");

const EMPTY = { sessions: [], pings: [], activity: [] };

function readAll() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      pings: Array.isArray(parsed.pings) ? parsed.pings : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeAll(data) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

const sameDay = (value, date) => String(value ?? "").slice(0, 10) === date;

/** Agent ids clocked in on `date` (a session with no clock_out yet). */
export function clockedInAgentIds(date) {
  const { sessions } = readAll();
  return new Set(
    sessions
      .filter((s) => sameDay(s.clock_in, date) && !s.clock_out)
      .map((s) => String(s.agent_id))
  );
}

/** Per-agent clock-in/out + last known position for `date`. */
export function agentDayStatus(agentId, date) {
  const { sessions, pings } = readAll();
  const id = String(agentId);

  const daySessions = sessions
    .filter((s) => String(s.agent_id) === id && sameDay(s.clock_in, date))
    .sort((a, b) => new Date(a.clock_in) - new Date(b.clock_in));

  const dayPings = pings
    .filter((p) => String(p.agent_id) === id && sameDay(p.timestamp, date))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const first = daySessions[0] ?? null;
  const last = daySessions[daySessions.length - 1] ?? null;

  return {
    clocked_in: Boolean(last && !last.clock_out),
    clock_in_at: first?.clock_in ?? null,
    clock_out_at: last?.clock_out ?? null,
    last_ping: dayPings[dayPings.length - 1] ?? null,
    route: dayPings,
  };
}

/** Activity entries for one agent on `date`, newest first. */
export function agentActivity(agentId, date) {
  const { activity } = readAll();
  return activity
    .filter((a) => String(a.agent_id) === String(agentId) && sameDay(a.timestamp, date))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/* ── Write helpers, for whenever a mobile app / backend starts feeding this ── */

export function recordClockIn(agentId, at = new Date().toISOString()) {
  const data = readAll();
  data.sessions.push({ agent_id: String(agentId), clock_in: at, clock_out: null });
  writeAll(data);
}

export function recordClockOut(agentId, at = new Date().toISOString()) {
  const data = readAll();
  const open = [...data.sessions].reverse().find((s) => String(s.agent_id) === String(agentId) && !s.clock_out);
  if (open) open.clock_out = at;
  writeAll(data);
}

export function recordPing(agentId, { lat, lng, accuracy, timestamp = new Date().toISOString() }) {
  const data = readAll();
  data.pings.push({ agent_id: String(agentId), lat, lng, accuracy, timestamp });
  writeAll(data);
}

export function recordActivity(agentId, { type, detail, timestamp = new Date().toISOString() }) {
  const data = readAll();
  data.activity.push({ agent_id: String(agentId), type, detail, timestamp });
  writeAll(data);
}
