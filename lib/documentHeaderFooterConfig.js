/**
 * lib/documentHeaderFooterConfig.js — Document Header/Footer settings.
 * Lets an admin replace the header/footer banner images that get stamped
 * onto generated documents (currently the NOC PDF + its preview) from the
 * Settings screen instead of swapping files on disk by hand.
 *
 * Config lives in data/document_header_footer_config.json. headerUrl /
 * footerUrl point at an uploaded image under public/assets (written by
 * app/api/config/document-header-footer/upload/route.js); when null, the
 * bundled default images (public/assets/noc_header.jpg / noc_Footer.jpg)
 * are used instead — see lib/noc/pdf.js.
 */

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "document_header_footer_config.json");

export const DOC_HEADER_FOOTER_DEFAULTS = {
  headerUrl: null,
  headerFormat: null,
  footerUrl: null,
  footerFormat: null,
  footerText: null,
  updatedAt: null,
};

export const DOC_FORMAT_TO_MIME = { JPEG: "image/jpeg", PNG: "image/png", WEBP: "image/webp" };
export const DOC_FORMAT_TO_EXT = { JPEG: "jpg", PNG: "png", WEBP: "webp" };

/** Reads the current config, falling back to defaults. */
export function readDocumentHeaderFooterConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && typeof cfg === "object") return { ...DOC_HEADER_FOOTER_DEFAULTS, ...cfg };
    }
  } catch {
    /* unreadable/corrupt — use defaults */
  }
  return { ...DOC_HEADER_FOOTER_DEFAULTS };
}

/** Writes the config. */
export function writeDocumentHeaderFooterConfig(body) {
  const cfg = {
    headerUrl: body?.headerUrl || null,
    headerFormat: body?.headerFormat || null,
    footerUrl: body?.footerUrl || null,
    footerFormat: body?.footerFormat || null,
    footerText: body?.footerText ? String(body.footerText).trim().slice(0, 200) : null,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}

/**
 * Resolves the configured custom image for a slot ("header"|"footer") to
 * an absolute fs path + jsPDF image format, or null when none is set / the
 * uploaded file is missing — callers fall back to the bundled default asset.
 */
export function resolveDocAssetPath(slot, cfg = readDocumentHeaderFooterConfig()) {
  const url = slot === "header" ? cfg.headerUrl : cfg.footerUrl;
  if (!url) return null;

  const format = (slot === "header" ? cfg.headerFormat : cfg.footerFormat) || "JPEG";
  const p = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
  if (!fs.existsSync(p)) return null;

  return { path: p, format, mime: DOC_FORMAT_TO_MIME[format] || "image/jpeg" };
}
