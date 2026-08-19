/**
 * lib/ndcTemplate.js — admin-editable No Dues Certificate (NDC) text. Issued
 * after a settlement is paid off (as opposed to the NOC, which is for a
 * loan fully repaid at the original terms). Same {placeholder} pattern as
 * lib/nocTemplate.js.
 */

import fs from "fs";
import path from "path";

const TEMPLATE_FILE = path.join(process.cwd(), "data", "ndc_template.json");

export const NDC_PLACEHOLDERS = ["loanNo", "borrowerName", "pan", "ndcDateDisp", "settleDateDisp", "settleAmtDisp", "waiverAmtDisp", "remarks"];

export const NDC_TEMPLATE_DEFAULTS = {
  title: "NO DUES CERTIFICATE",
  salutation: "Dear {borrowerName},",
  greeting: "Greetings!",
  paragraphs: [
    "This is to certify that your loan account bearing Loan Account Number {loanNo} with BlinkR Loan, a brand of RBI Registered NBFC: Dev-Aashish Capitals Private Limited, was settled under a One-Time Settlement (OTS) arrangement.",
    "We hereby confirm that an amount of Rs. {settleAmtDisp} was received on {settleDateDisp} towards full and final settlement of the above-mentioned loan account.",
    "As on date, there are no further dues, liabilities, or obligations payable by you in respect of the above-mentioned loan account.",
    "Please note that a waiver of Rs. {waiverAmtDisp} was extended as part of this settlement. As this account was settled rather than repaid in full as per the original terms, it may be reported to credit bureaus as \"Settled\" rather than \"Closed\".",
    "This No Dues Certificate is issued at your request for your record and future reference.",
  ],
  closingRegards: "Regards,",
  closingTeam: "Team BlinkR Loan",
  closingCompany: "DEV-AASHISH CAPITALS PRIVATE LIMITED (NBFC)",
};

export function readNdcTemplate() {
  try {
    if (fs.existsSync(TEMPLATE_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(TEMPLATE_FILE, "utf8"));
      if (cfg && typeof cfg === "object") {
        return {
          ...NDC_TEMPLATE_DEFAULTS,
          ...cfg,
          paragraphs: Array.isArray(cfg.paragraphs) && cfg.paragraphs.length ? cfg.paragraphs : NDC_TEMPLATE_DEFAULTS.paragraphs,
        };
      }
    }
  } catch {
    /* unreadable/corrupt — fall back to defaults */
  }
  return { ...NDC_TEMPLATE_DEFAULTS };
}

export function writeNdcTemplate(body) {
  const d = NDC_TEMPLATE_DEFAULTS;
  const cfg = {
    title: String(body?.title || d.title).slice(0, 200),
    salutation: String(body?.salutation || d.salutation).slice(0, 200),
    greeting: String(body?.greeting || d.greeting).slice(0, 200),
    paragraphs:
      Array.isArray(body?.paragraphs) && body.paragraphs.some((p) => String(p || "").trim())
        ? body.paragraphs.map((p) => String(p ?? "").slice(0, 2000)).filter((p) => p.trim())
        : d.paragraphs,
    closingRegards: String(body?.closingRegards || d.closingRegards).slice(0, 100),
    closingTeam: String(body?.closingTeam || d.closingTeam).slice(0, 100),
    closingCompany: String(body?.closingCompany || d.closingCompany).slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(TEMPLATE_FILE), { recursive: true });
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(cfg, null, 4));
    return { ok: true, config: cfg };
  } catch {
    return { ok: false, config: cfg };
  }
}

export function fillNdcTemplate(str, vars) {
  return String(str ?? "").replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key] ?? "") : m));
}
