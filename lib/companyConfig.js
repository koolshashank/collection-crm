/**
 * lib/companyConfig.js — Company Setup (app name, tagline, logo, theme).
 * Mirrors lib/gatewayConfig.js's exact idiom: config lives in
 * data/company_config.json, DEFAULTS hardcodes today's real values so a
 * fresh install / a Reset both fall back to exactly what the app already
 * looks like.
 */

import fs from "fs";
import path from "path";
import { deriveAccentShades, deriveNavyShades } from "./colorUtils";

const CONFIG_FILE = path.join(process.cwd(), "data", "company_config.json");

export const COMPANY_DEFAULTS = {
  appName: "Collection CRM",
  tagline: "Blinkr Loan",
  logoUrl: null,
  accent: "#0f9b8e",
  accentDark: "#0c7a70",
  accentLight: "#e6f6f4",
  navy: "#1b2a4a",
  navyLight: "#26365c",
};

/** Reads the current company config, falling back to defaults. */
export function readCompanyConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...COMPANY_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...COMPANY_DEFAULTS };
}

/**
 * Writes the company config. Derives accent-dark/accent-light and
 * navy-light from the two base colors so every page request just reads
 * back plain values — no color math on every render.
 */
export function writeCompanyConfig(body) {
  const accent = body?.accent || COMPANY_DEFAULTS.accent;
  const navy = body?.navy || COMPANY_DEFAULTS.navy;
  const accentShades = deriveAccentShades(accent);
  const navyShades = deriveNavyShades(navy);

  const cfg = {
    appName: String(body?.appName || COMPANY_DEFAULTS.appName).trim().slice(0, 60),
    tagline: String(body?.tagline || COMPANY_DEFAULTS.tagline).trim().slice(0, 60),
    logoUrl: body?.logoUrl || null,
    accent,
    accentDark: accentShades.dark,
    accentLight: accentShades.light,
    navy,
    navyLight: navyShades.light,
  };

  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}

/** Restores the config file to COMPANY_DEFAULTS exactly. */
export function resetCompanyConfig() {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(COMPANY_DEFAULTS, null, 4));
    return { ok: true, config: { ...COMPANY_DEFAULTS } };
  } catch {
    return { ok: false, config: { ...COMPANY_DEFAULTS } };
  }
}
