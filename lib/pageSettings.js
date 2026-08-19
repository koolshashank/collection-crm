/**
 * lib/pageSettings.js — generic, schema-driven per-page display settings.
 *
 * Any page can register a set of admin-toggleable fields here (show/hide a
 * button, mask a field, etc.). The Settings UI ("Page Setup" section) and
 * the /api/config/page-settings route are both driven off this registry —
 * adding a new page's settings only requires adding an entry below, no
 * other code needs to change.
 */

import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "page_settings.json");

export const PAGE_SETTINGS_SCHEMA = {
  "customer-one-pager": {
    label: "Customer One-Pager",
    fields: [
      {
        key: "showUpiReference",
        label: "UPI References (More menu)",
        sub: "Show the UPI References option in the More menu and allow opening its transaction-summary modal",
        default: true,
      },
      {
        key: "maskSensitiveData",
        label: "Mask Sensitive Data",
        sub: "Mask PAN, Aadhaar, bank account, IFSC and mobile numbers shown on this page",
        default: false,
      },
    ],
  },
};

function defaultsForPage(pageKey) {
  const page = PAGE_SETTINGS_SCHEMA[pageKey];
  const out = {};
  for (const f of page?.fields ?? []) out[f.key] = f.default;
  return out;
}

/** Reads saved settings for every registered page, filled in with defaults. */
export function readPageSettings() {
  let saved = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      if (parsed && typeof parsed === "object") saved = parsed;
    }
  } catch {
    /* unreadable/corrupt — fall back to defaults */
  }
  const out = {};
  for (const pageKey of Object.keys(PAGE_SETTINGS_SCHEMA)) {
    out[pageKey] = { ...defaultsForPage(pageKey), ...(saved[pageKey] || {}) };
  }
  return out;
}

/**
 * Merges `partial` (a { pageKey: { fieldKey: value } } subset) into the
 * saved settings and writes the whole file back. Unknown pages/fields are
 * ignored so a stale client can never write outside the current schema.
 */
export function writePageSettings(partial) {
  const current = readPageSettings();
  const updatedAt = new Date().toISOString();
  const merged = { ...current };

  for (const pageKey of Object.keys(partial || {})) {
    const page = PAGE_SETTINGS_SCHEMA[pageKey];
    if (!page) continue;
    const clean = {};
    for (const f of page.fields) {
      clean[f.key] = Boolean(partial[pageKey]?.[f.key] ?? current[pageKey][f.key]);
    }
    merged[pageKey] = { ...clean, updatedAt };
  }

  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 4));
    return { ok: true, settings: merged };
  } catch {
    return { ok: false, settings: merged };
  }
}
