/**
 * lib/twoFactorStore.js — per-user Google Authenticator (TOTP) secrets.
 * Mirrors lib/gatewayConfig.js: flat JSON file at PROJECT_ROOT/data/two_factor.json,
 * keyed by employee user_id, since this app has no local user table.
 * Whether a code is actually required is governed separately by the global
 * switch in lib/twoFactorPolicy.js — this store just tracks each user's secret.
 * Shape: { "<user_id>": { secret, username, updatedAt } }
 */

import fs from "fs";
import path from "path";

const STORE_FILE = path.join(process.cwd(), "data", "two_factor.json");

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      if (data && typeof data === "object") return data;
    }
  } catch {
    /* unreadable/corrupt — treat as empty */
  }
  return {};
}

function writeStore(store) {
  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 4));
    return true;
  } catch {
    return false;
  }
}

/** Returns the 2FA record for a user_id, or null if never enrolled. */
export function getUserRecord(userId) {
  const store = readStore();
  return store[String(userId)] || null;
}

/** Merges a patch into the user's record and persists it. */
export function setUserRecord(userId, patch) {
  const store = readStore();
  const key = String(userId);
  store[key] = { ...store[key], ...patch, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store[key];
}
