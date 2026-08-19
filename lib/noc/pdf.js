import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import { readDocumentHeaderFooterConfig, resolveDocAssetPath } from "../documentHeaderFooterConfig";
import { readNocTemplate, fillNocTemplate } from "../nocTemplate";

/**
 * lib/noc/pdf.js — shared NOC PDF builder.
 * Port of the FPDF document built identically in noc_generate.php
 * (class NOC_PDF) and noc_email.php (class NOC_EMAIL_PDF).
 *
 * PDF SWAP NOTE: PHP used FPDF; here we use jsPDF (installed, runs in
 * Node without a canvas). Layout constants, colours, font sizes, text
 * and paragraph order are copied 1:1 from the PHP:
 *   Header image : noc_header.jpg  (210mm x 32.3mm full-bleed)
 *   Footer image : noc_footer.jpg  (210mm x 31.8mm full-bleed)
 * Images live at PROJECT_ROOT/public/assets/ (note: the footer file on
 * disk is `noc_Footer.jpg` with a capital F — both casings are tried,
 * mirroring PHP's file_exists() fallback behaviour).
 */

/* ══ CONSTANTS (same as PHP defines) ══ */
const HDR_H = 32.3;
const FTR_H = 31.8;
const PG_W = 210;
const PG_H = 297;
const MARGIN = 15;
const CONTENT_W = PG_W - MARGIN * 2;
const PT_TO_MM = 25.4 / 72;

const NAVY = [13, 52, 100];

function assetPath(...names) {
  for (const n of names) {
    try {
      const p = path.join(process.cwd(), "public", "assets", n);
      if (fs.existsSync(p)) return p;
    } catch {
      /* fail soft, same as PHP file_exists guard */
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

/** Reads PNG pixel dimensions from the IHDR chunk (getimagesize() equivalent). */
function pngSize(bytes) {
  try {
    if (!bytes || bytes.length < 24) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  } catch {
    return null;
  }
}

/** PHP number_format($n, 2) — western thousands grouping, 2 decimals. */
export function phpNumberFormat(n) {
  const v = Number.parseFloat(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** PHP date('d-M-Y', strtotime($d)) with the PHP fallbacks: '' -> fallback, unparseable -> raw string. */
export function phpDate_dMY(d, fallback = "--") {
  if (!d) return fallback;
  const t = new Date(d);
  if (isNaN(t)) return d;
  return `${String(t.getDate()).padStart(2, "0")}-${MONTHS[t.getMonth()]}-${t.getFullYear()}`;
}

/** PHP date('d M Y', strtotime($d)) — used by noc_email.php (em_date). */
export function phpDate_dSpMY(d, fallback = "—") {
  if (!d) return fallback;
  const t = new Date(d);
  if (isNaN(t)) return d;
  return `${String(t.getDate()).padStart(2, "0")} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
}

/** PHP date('Ymd') / date('d-M-Y') for "now" (server time). */
export function todayYmd() {
  const t = new Date();
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
}
export function today_dMY() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2, "0")}-${MONTHS[t.getMonth()]}-${t.getFullYear()}`;
}

/** PHP trim(strip_tags($v)) equivalent. */
export function nocClean(v) {
  return String(v ?? "").replace(/<[^>]*>/g, "").trim();
}

/**
 * Builds the NOC PDF and returns a Node Buffer.
 * All display strings are pre-formatted by the caller so the generate
 * route ('--' dashes, d-M-Y dates) and the email route ('—' dashes,
 * d M Y dates) keep their exact PHP wording differences.
 *
 * @param {object} p
 * @param {string} p.loanNo       Loan account number
 * @param {string} p.fullName     Borrower name
 * @param {string} p.pan          PAN (meta row skipped when empty — same as PHP)
 * @param {string} p.nocDateDisp  Formatted NOC date
 * @param {string} p.collDateDisp Formatted collection date (already defaulted to '--' / '—')
 * @param {string} p.collAmtDisp  number_format($displayCollAmt, 2) string
 * @param {string} p.remarks      Optional remarks
 * @param {object} [p.template]   Draft template override (NOC preview) — when
 *                                omitted, the saved template (Settings →
 *                                Communication → NOC Template) is used.
 */
export function buildNocPdf({ loanNo, fullName, pan, nocDateDisp, collDateDisp, collAmtDisp, remarks, template }) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const tpl = template || readNocTemplate();
  const vars = { loanNo, fullName, pan: pan || "", nocDateDisp, collDateDisp, collAmtDisp, remarks: remarks || "" };
  const fill = (s) => fillNocTemplate(s, vars);

  // Header/footer banners are admin-configurable (Settings → Document
  // Header & Footer); fall back to the bundled default images when no
  // custom one has been uploaded.
  const docCfg = readDocumentHeaderFooterConfig();
  const customHeader = resolveDocAssetPath("header", docCfg);
  const customFooter = resolveDocAssetPath("footer", docCfg);
  const headerImg = customHeader ? readAssetAbs(customHeader.path) : readAsset("noc_header.jpg", "noc_Header.jpg");
  const headerFormat = customHeader?.format || "JPEG";
  const footerImg = customFooter ? readAssetAbs(customFooter.path) : readAsset("noc_footer.jpg", "noc_Footer.jpg");
  const footerFormat = customFooter?.format || "JPEG";
  const logoBytes = readAsset("Logo_BlinkR.png", "logo_blinkr.png");

  let y = HDR_H + 6; // FPDF SetMargins top = HDR_H + 6

  const setFont = (style, sizePt, color) => {
    doc.setFont("helvetica", style); // Arial -> helvetica (core PDF font)
    doc.setFontSize(sizePt);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  /** FPDF Cell(w, h, txt, 0, 1, align) — single line, advances y. */
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

  /** FPDF MultiCell(0, lh, txt, 0, 'J') — justified paragraph, advances y. */
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

  /* ── TITLE — Arial BU 13, navy, centered, underlined ── */
  setFont("bold", 13, NAVY);
  const title = tpl.title;
  cell(9, title, "C", MARGIN, 13);
  const tw = doc.getTextWidth(title);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.3);
  doc.line(PG_W / 2 - tw / 2, y - 1.6, PG_W / 2 + tw / 2, y - 1.6); // underline ('U' style in FPDF)
  y += 4; // Ln(4)

  /* ── META BLOCK (metaRow helper: bold navy label w=50 + regular value) ── */
  const metaRow = (label, val) => {
    setFont("bold", 9.5, NAVY);
    doc.text(label, MARGIN, y + 3 + 9.5 * PT_TO_MM * 0.36);
    setFont("normal", 9.5, [30, 30, 30]);
    doc.text(String(val), MARGIN + 50, y + 3 + 9.5 * PT_TO_MM * 0.36);
    y += 6;
  };
  metaRow("Loan Account No. :", loanNo);
  if (pan) metaRow("PAN :", pan);
  metaRow("Date :", nocDateDisp);
  y += 5; // Ln(5)

  /* ── THIN RULE ── */
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PG_W - MARGIN, y);
  y += 5; // Ln(5)

  /* ── SALUTATION ── */
  setFont("bold", 10, [20, 20, 20]);
  cell(6, fill(tpl.salutation), "L", MARGIN, 10);
  setFont("italic", 9.5, [100, 100, 100]);
  cell(6, tpl.greeting, "L", MARGIN, 9.5);
  y += 4; // Ln(4)

  /* ── BODY PARAGRAPHS (admin-editable — Settings → Communication → NOC Template) ── */
  const body = (txt) => {
    multiCell(6.5, txt, 9.5, "normal", [30, 30, 30]);
    y += 3; // Ln(3)
  };

  for (const p of tpl.paragraphs) body(fill(p));

  if (remarks) {
    multiCell(6, "Note: " + remarks, 9, "italic", [80, 80, 80]);
    y += 3;
  }
  y += 6; // Ln(6)

  /* ── REGARDS ── */
  ensureSpace(40);
  setFont("normal", 9.5, [30, 30, 30]);
  cell(6, tpl.closingRegards, "L", MARGIN, 9.5);
  setFont("bold", 10, NAVY);
  cell(6, tpl.closingTeam, "L", MARGIN, 10);

  /* ── BlinkR Logo instead of plain text (fallback matches PHP) ── */
  let logoDrawn = false;
  if (logoBytes) {
    try {
      const size = pngSize(logoBytes);
      const logoW = 38;
      const logoH = size ? Math.round((logoW * size.h) / size.w) : 14;
      doc.addImage(logoBytes, "PNG", MARGIN, y, logoW, logoH);
      y += logoH + 4;
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }
  if (!logoDrawn) {
    setFont("bold", 10, [180, 30, 30]);
    cell(6, "BlinkR Loan", "L", MARGIN, 10);
  }

  setFont("normal", 9, [60, 60, 60]);
  cell(5, tpl.closingCompany, "L", MARGIN, 9);
  y += 8; // Ln(8)

  /* ── STAMP LINE ── */
  setFont("italic", 7.5, [170, 150, 130]);
  cell(5, "This document is system-generated and does not require a physical signature.   Date: " + nocDateDisp, "C", MARGIN, 7.5);

  /* ── HEADER + FOOTER on every page (FPDF Header()/Footer() equivalents) ── */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    /* Header */
    if (headerImg) {
      try {
        doc.addImage(headerImg, headerFormat, 0, 0, PG_W, HDR_H);
      } catch {
        drawHeaderFallback(doc);
      }
    } else {
      drawHeaderFallback(doc);
    }

    /* Footer */
    const yImg = PG_H - FTR_H;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text(
      "Page " + i + "/" + pages + "   |   Loan: " + loanNo + "   |   Generated: " + today_dMY(),
      PG_W / 2,
      yImg - 6 + 3.5,
      { align: "center" }
    );
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

  return Buffer.from(doc.output("arraybuffer"));
}

function drawHeaderFallback(doc) {
  doc.setFillColor(13, 52, 100);
  doc.rect(0, 0, PG_W, HDR_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("DEV-AASHISH CAPITALS PVT. LTD.  |  BlinkR Loan", PG_W / 2, 17, { align: "center" });
}

function drawFooterFallback(doc, yImg, overrideText) {
  doc.setFillColor(13, 52, 100);
  doc.rect(0, yImg, PG_W, FTR_H, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  // Priority: Settings → Document Header & Footer, then NOC_FOOTER_TEXT in
  // .env.local, then the built-in default.
  const footerText =
    overrideText || process.env.NOC_FOOTER_TEXT || "RBI Registered NBFC | +91-8595333222 | Info@blinkrloan.com";
  doc.text(footerText, PG_W / 2, yImg + 15, { align: "center" });
}

/** Absolute paths (+ mime types) of the inline-email images, or null when missing. */
export function nocImagePaths() {
  const cfg = readDocumentHeaderFooterConfig();
  const customHeader = resolveDocAssetPath("header", cfg);
  const customFooter = resolveDocAssetPath("footer", cfg);
  return {
    header: customHeader?.path || assetPath("noc_header.jpg", "noc_Header.jpg"),
    headerMime: customHeader?.mime || "image/jpeg",
    footer: customFooter?.path || assetPath("noc_footer.jpg", "noc_Footer.jpg"),
    footerMime: customFooter?.mime || "image/jpeg",
    logo: assetPath("Logo_BlinkR.png", "logo_blinkr.png"),
  };
}
