/**
 * lib/notifications.js — real-time admin security alerts.
 * Flat JSON file at data/notifications.json (capped at MAX_STORED, newest
 * last) plus an in-memory subscriber list so the SSE route
 * (app/api/notifications/stream/route.js) can push new alerts to every
 * connected admin browser the instant they happen. The in-memory bus only
 * works within a single Node process — fine for this app's single
 * `next start` deployment, but wouldn't fan out across multiple workers.
 */

import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data", "notifications.json");
const MAX_STORED = 500;
const subscribers = new Set();

function readAll() {
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (Array.isArray(data)) return data;
    }
  } catch {
    /* unreadable/corrupt — treat as empty */
  }
  return [];
}

function writeAll(list) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list.slice(-MAX_STORED), null, 2));
  } catch (err) {
    console.error("notifications writeAll failed:", err);
  }
}

/** Records a new alert, persists it, and pushes it to every live subscriber. */
export function addNotification({ type, message, actor = null, entity = null, meta = {} }) {
  const notif = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    type,
    message,
    actor,
    entity,
    meta,
    read: false,
  };
  const list = readAll();
  list.push(notif);
  writeAll(list);
  for (const send of subscribers) {
    try {
      send(notif);
    } catch {
      /* a dead subscriber shouldn't break the others */
    }
  }
  return notif;
}

export function listNotifications({ limit = 50 } = {}) {
  const list = readAll();
  const unread = list.filter((n) => !n.read).length;
  return { notifications: list.slice(-limit).reverse(), unread, total: list.length };
}

export function markAllRead() {
  const list = readAll();
  let changed = false;
  for (const n of list) {
    if (!n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeAll(list);
}

export function markRead(ids = []) {
  const idSet = new Set(ids);
  const list = readAll();
  let changed = false;
  for (const n of list) {
    if (idSet.has(n.id) && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeAll(list);
}

/** Registers an SSE connection; returns an unsubscribe function. */
export function subscribeToNotifications(send) {
  subscribers.add(send);
  return () => subscribers.delete(send);
}
