/**
 * lib/settlementLetterTemplate.js — admin-editable settlement offer letter
 * text. Same pattern as lib/nocTemplate.js: every string is a template with
 * {placeholder} tokens filled in with the real settlement's details at
 * generation time.
 */

import fs from "fs";
import path from "path";

const TEMPLATE_FILE = path.join(process.cwd(), "data", "settlement_letter_template.json");

export const SETTLEMENT_LETTER_PLACEHOLDERS = [
  "borrowerName",
  "loanNo",
  "mobile",
  "outstandingAmt",
  "settleType",
  "waiverAmt",
  "settleDateDisp",
  "settleAmtDisp",
  "letterDateDisp",
];

export const SETTLEMENT_LETTER_TEMPLATE_DEFAULTS = {
  title: "LOAN SETTLEMENT LETTER",
  salutation: "Dear {borrowerName},",
  greeting: "We refer to your loan account and the settlement discussion held with our recovery team.",
  paragraphs: [
    "This is to confirm that BlinkR Loan has agreed to settle the above-referenced loan account bearing Loan Account Number {loanNo} against a one-time settlement payment as detailed below, in full and final satisfaction of the outstanding dues on this loan, subject to receipt of the settlement amount on or before the settlement date mentioned.",
  ],
  tableLabels: {
    outstanding: "Outstanding Amount",
    settleType: "Settlement Type",
    waiver: "Waiver / Concession",
    settleDate: "Settlement Date",
    settleAmt: "Settlement Amount Payable",
  },
  closingParagraph:
    'Upon realization of the settlement amount in full, your loan account will be marked as "Settled" and no further dues shall be payable by you against this loan. Please note that a settled account may be reported differently to credit bureaus than a fully closed account.',
  closingRegards: "Regards,",
  closingTeam: "Recovery & Collections Team",
  closingCompany: "BlinkR Loan",
};

export function readSettlementLetterTemplate() {
  try {
    if (fs.existsSync(TEMPLATE_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(TEMPLATE_FILE, "utf8"));
      if (cfg && typeof cfg === "object") {
        return {
          ...SETTLEMENT_LETTER_TEMPLATE_DEFAULTS,
          ...cfg,
          paragraphs: Array.isArray(cfg.paragraphs) && cfg.paragraphs.length ? cfg.paragraphs : SETTLEMENT_LETTER_TEMPLATE_DEFAULTS.paragraphs,
          tableLabels: { ...SETTLEMENT_LETTER_TEMPLATE_DEFAULTS.tableLabels, ...(cfg.tableLabels || {}) },
        };
      }
    }
  } catch {
    /* unreadable/corrupt — fall back to defaults */
  }
  return { ...SETTLEMENT_LETTER_TEMPLATE_DEFAULTS, tableLabels: { ...SETTLEMENT_LETTER_TEMPLATE_DEFAULTS.tableLabels } };
}

export function writeSettlementLetterTemplate(body) {
  const d = SETTLEMENT_LETTER_TEMPLATE_DEFAULTS;
  const cfg = {
    title: String(body?.title || d.title).slice(0, 200),
    salutation: String(body?.salutation || d.salutation).slice(0, 200),
    greeting: String(body?.greeting || d.greeting).slice(0, 300),
    paragraphs:
      Array.isArray(body?.paragraphs) && body.paragraphs.some((p) => String(p || "").trim())
        ? body.paragraphs.map((p) => String(p ?? "").slice(0, 2000)).filter((p) => p.trim())
        : d.paragraphs,
    tableLabels: {
      outstanding: String(body?.tableLabels?.outstanding || d.tableLabels.outstanding).slice(0, 60),
      settleType: String(body?.tableLabels?.settleType || d.tableLabels.settleType).slice(0, 60),
      waiver: String(body?.tableLabels?.waiver || d.tableLabels.waiver).slice(0, 60),
      settleDate: String(body?.tableLabels?.settleDate || d.tableLabels.settleDate).slice(0, 60),
      settleAmt: String(body?.tableLabels?.settleAmt || d.tableLabels.settleAmt).slice(0, 60),
    },
    closingParagraph: String(body?.closingParagraph || d.closingParagraph).slice(0, 2000),
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

export function fillSettlementLetterTemplate(str, vars) {
  return String(str ?? "").replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key] ?? "") : m));
}
