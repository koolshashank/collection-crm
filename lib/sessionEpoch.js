/**
 * lib/sessionEpoch.js — global "force logout everyone" counter.
 * Mirrors lib/twoFactorPolicy.js: flat JSON file at
 * PROJECT_ROOT/data/session_epoch.json, { epoch: number }, default 0.
 * Bumping it instantly invalidates every previously-issued session
 * cookie (see setSession/getSession in lib/session.js) with no
 * per-user session store needed.
 */

import fs from "fs";
import path from "path";

const EPOCH_FILE = path.join(process.cwd(), "data", "session_epoch.json");

export function getSessionEpoch() {
  try {
    if (fs.existsSync(EPOCH_FILE)) {
      const data = JSON.parse(fs.readFileSync(EPOCH_FILE, "utf8"));
      if (typeof data?.epoch === "number") return data.epoch;
    }
  } catch {
    /* unreadable/corrupt — treat as default */
  }
  return 0;
}

export function bumpSessionEpoch() {
  const next = getSessionEpoch() + 1;
  try {
    fs.mkdirSync(path.dirname(EPOCH_FILE), { recursive: true });
    fs.writeFileSync(EPOCH_FILE, JSON.stringify({ epoch: next }, null, 4));
  } catch {
    /* fail-soft — worst case the force-logout doesn't take effect */
  }
  return next;
}
