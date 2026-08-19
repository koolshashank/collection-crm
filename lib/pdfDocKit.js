/**
 * lib/pdfDocKit.js — shared jsPDF layout toolkit + admin-configurable
 * header/footer stamping, factored out of lib/noc/pdf.js so the settlement
 * letter and NDC builders don't each re-implement the same A4/margins/
 * cell/multiCell mechanics. lib/noc/pdf.js keeps its own copies of these
 * (untouched, to avoid any regression risk on that already-shipped path) —
 * this is the shared base for documents built after it.
 */

import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import { readDocumentHeaderFooterConfig, resolveDocAssetPath } from "./documentHeaderFooterConfig";

export const HDR_H = 32.3;
export const FTR_H = 31.8;
export const PG_W = 210;
export const PG_H = 297;
export const MARGIN = 15;
export const CONTENT_W = PG_W - MARGIN * 2;
export const PT_TO_MM = 25.4 / 72;
export const NAVY = [13, 52, 100];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function phpNumberFormat(n) {
  const v = Number.parseFloat(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function phpDate_dMY(d, fallback = "--") {
  if (!d) return fallback;
  const t = new Date(d);
  if (isNaN(t)) return d;
  return `${String(t.getDate()).padStart(2, "0")}-${MONTHS[t.getMonth()]}-${t.getFullYear()}`;
}

export function today_dMY() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2, "0")}-${MONTHS[t.getMonth()]}-${t.getFullYear()}`;
}

export function todayYmd() {
  const t = new Date();
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
}

/** trim(strip_tags($v)) equivalent — sanitizes free-text before it lands in a PDF or email. */
export function cleanText(v) {
  return String(v ?? "").replace(/<[^>]*>/g, "").trim();
}

function assetPath(...names) {
  for (const n of names) {
    try {
      const p = path.join(process.cwd(), "public", "assets", n);
      if (fs.existsSync(p)) return p;
    } catch {
      /* fail soft */
    }
  }
  return null;
}
function readAsset(...names) {
  const p = assetPath(...names);
  if (!p) return null;
  try {
    return new Uint8Array(fs.readFileSync(p));
  } catch {
    return null;
  }
}
function readAssetAbs(p) {
  try {
    return new Uint8Array(fs.readFileSync(p));
  } catch {
    return null;
  }
}
function pngSize(bytes) {
  try {
    if (!bytes || bytes.length < 24) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  } catch {
    return null;
  }
}

/** A fresh A4 doc + the same Cell/MultiCell-style helpers lib/noc/pdf.js uses. */
export function createPdfDoc() {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  let y = HDR_H + 6;

  const setFont = (style, sizePt, color) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(sizePt);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const cell = (h, txt, align = "L", x = MARGIN, sizePt = 9.5) => {
    const baseline = y + h / 2 + sizePt * PT_TO_MM * 0.36;
    if (align === "C") doc.text(txt, PG_W / 2, baseline, { align: "center" });
    else doc.text(txt, x, baseline);
    y += h;
  };

  const ensureSpace = (needed) => {
    if (y + needed > PG_H - (FTR_H + 10)) {
      doc.addPage();
      y = HDR_H + 6;
    }
  };

  const multiCell = (lh, txt, sizePt, style, color) => {
    setFont(style, sizePt, color);
    const lines = doc.splitTextToSize(txt, CONTENT_W);
    ensureSpace(lines.length * lh);
    const fontMm = sizePt * PT_TO_MM;
    doc.text(txt, MARGIN, y + lh / 2 + fontMm * 0.36, {
      maxWidth: CONTENT_W,
      align: "justify",
      lineHeightFactor: lh / fontMm,
    });
    y += lines.length * lh;
  };

  return {
    doc,
    setFont,
    cell,
    ensureSpace,
    multiCell,
    getY: () => y,
    setY: (v) => {
      y = v;
    },
  };
}

/** Draws the BlinkR logo (or a text fallback) at (MARGIN, y) and returns the new y. */
export function drawLogo(doc, y, fallbackLabel = "BlinkR Loan") {
  const logoBytes = readAsset("Logo_BlinkR.png", "logo_blinkr.png");
  if (logoBytes) {
    try {
      const size = pngSize(logoBytes);
      const logoW = 38;
      const logoH = size ? Math.round((logoW * size.h) / size.w) : 14;
      doc.addImage(logoBytes, "PNG", MARGIN, y, logoW, logoH);
      return y + logoH + 4;
    } catch {
      /* fall through to text fallback */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(180, 30, 30);
  doc.text(fallbackLabel, MARGIN, y + 6);
  return y + 10;
}

function drawHeaderFallback(doc) {
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, PG_W, HDR_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("DEV-AASHISH CAPITALS PVT. LTD.  |  BlinkR Loan", PG_W / 2, 17, { align: "center" });
}

function drawFooterFallback(doc, yImg, overrideText) {
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, yImg, PG_W, FTR_H, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  const footerText = overrideText || process.env.NOC_FOOTER_TEXT || "RBI Registered NBFC | +91-8595333222 | Info@blinkrloan.com";
  doc.text(footerText, PG_W / 2, yImg + 15, { align: "center" });
}

/**
 * Stamps the same admin-configurable header/footer banner (Settings →
 * Communication → Document Header & Footer) on every page of `doc`.
 * `footerCenterText(pageNum, pageCount)` supplies the small caption line
 * printed just above the footer banner (e.g. "Page 1/1 | Loan: … | …").
 */
export function stampHeaderFooter(doc, footerCenterText) {
  const docCfg = readDocumentHeaderFooterConfig();
  const customHeader = resolveDocAssetPath("header", docCfg);
  const customFooter = resolveDocAssetPath("footer", docCfg);
  const headerImg = customHeader ? readAssetAbs(customHeader.path) : readAsset("noc_header.jpg", "noc_Header.jpg");
  const headerFormat = customHeader?.format || "JPEG";
  const footerImg = customFooter ? readAssetAbs(customFooter.path) : readAsset("noc_footer.jpg", "noc_Footer.jpg");
  const footerFormat = customFooter?.format || "JPEG";

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    if (headerImg) {
      try {
        doc.addImage(headerImg, headerFormat, 0, 0, PG_W, HDR_H);
      } catch {
        drawHeaderFallback(doc);
      }
    } else {
      drawHeaderFallback(doc);
    }

    const yImg = PG_H - FTR_H;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text(footerCenterText(i, pages), PG_W / 2, yImg - 6 + 3.5, { align: "center" });

    if (footerImg) {
      try {
        doc.addImage(footerImg, footerFormat, 0, yImg, PG_W, FTR_H);
      } catch {
        drawFooterFallback(doc, yImg, docCfg.footerText);
      }
    } else {
      drawFooterFallback(doc, yImg, docCfg.footerText);
    }
  }
}

/** Simple bordered key/value table — same visual role as LetterPreview's .lpSettleBox. */
export function drawKeyValueTable(kit, rows, { rowH = 8, labelColor = [60, 60, 60], valueColor = [20, 20, 20] } = {}) {
  const { doc, getY, setY } = kit;
  kit.ensureSpace(rows.length * rowH + 4);
  const startY = getY();
  const valueColX = MARGIN + CONTENT_W * 0.58;

  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, startY, CONTENT_W, rowH * rows.length);

  rows.forEach(([label, value], i) => {
    const rowY = startY + i * rowH;
    if (i > 0) doc.line(MARGIN, rowY, MARGIN + CONTENT_W, rowY);
    const baseline = rowY + rowH / 2 + 9.5 * PT_TO_MM * 0.36;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(label, MARGIN + 4, baseline);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(String(value), valueColX, baseline);
  });

  setY(startY + rowH * rows.length + 6);
}
