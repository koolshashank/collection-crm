/**
 * lib/nocTemplate.js — admin-editable NOC certificate text. Same flat-JSON
 * read/write pattern as lib/settlementVintagePolicy.js. Every editable
 * string is a template with {placeholder} tokens filled in at generation
 * time (see fillNocTemplate) — the paragraph order/wording itself used to
 * be hardcoded in lib/noc/pdf.js; this just externalizes it.
 */

import fs from "fs";
import path from "path";

const TEMPLATE_FILE = path.join(process.cwd(), "data", "noc_template.json");

/** Every token buildNocPdf() knows how to fill in. */
export const NOC_PLACEHOLDERS = ["loanNo", "fullName", "pan", "nocDateDisp", "collDateDisp", "collAmtDisp", "remarks"];

export const NOC_TEMPLATE_DEFAULTS = {
  title: "NO OBJECTION CERTIFICATE",
  salutation: "Dear Mr. {fullName},",
  greeting: "Greetings!",
  paragraphs: [
    "This is to certify that you have availed a loan facility bearing Loan Account Number {loanNo} from BlinkR Loan, a brand of RBI Registered NBFC: Dev-Aashish Capitals Private Limited.",
    "We hereby confirm that the aforesaid loan account has been fully closed on {collDateDisp} upon receipt of the entire repayment amount due and payable against the said loan account as per Loan Agreement.",
    "The amount of Rs. {collAmtDisp} was collected on {collDateDisp} against the said loan account.",
    "As on date, there are no outstanding dues, liabilities, or obligations payable by you in respect of the above-mentioned loan account.",
    "The Company has no objection to the closure of the said loan account.",
    "This No Objection Certificate is issued at your request for your record and future reference.",
  ],
  closingRegards: "Regards,",
  closingTeam: "Team BlinkR Loan",
  closingCompany: "DEV-AASHISH CAPITALS PRIVATE LIMITED (NBFC)",
};

export function readNocTemplate() {
  try {
    if (fs.existsSync(TEMPLATE_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(TEMPLATE_FILE, "utf8"));
      if (cfg && typeof cfg === "object") {
        return {
          ...NOC_TEMPLATE_DEFAULTS,
          ...cfg,
          paragraphs: Array.isArray(cfg.paragraphs) && cfg.paragraphs.length ? cfg.paragraphs : NOC_TEMPLATE_DEFAULTS.paragraphs,
        };
      }
    }
  } catch {
    /* unreadable/corrupt — fall back to defaults */
  }
  return { ...NOC_TEMPLATE_DEFAULTS };
}

export function writeNocTemplate(body) {
  const cfg = {
    title: String(body?.title || NOC_TEMPLATE_DEFAULTS.title).slice(0, 200),
    salutation: String(body?.salutation || NOC_TEMPLATE_DEFAULTS.salutation).slice(0, 200),
    greeting: String(body?.greeting || NOC_TEMPLATE_DEFAULTS.greeting).slice(0, 200),
    paragraphs:
      Array.isArray(body?.paragraphs) && body.paragraphs.some((p) => String(p || "").trim())
        ? body.paragraphs.map((p) => String(p ?? "").slice(0, 2000)).filter((p) => p.trim())
        : NOC_TEMPLATE_DEFAULTS.paragraphs,
    closingRegards: String(body?.closingRegards || NOC_TEMPLATE_DEFAULTS.closingRegards).slice(0, 100),
    closingTeam: String(body?.closingTeam || NOC_TEMPLATE_DEFAULTS.closingTeam).slice(0, 100),
    closingCompany: String(body?.closingCompany || NOC_TEMPLATE_DEFAULTS.closingCompany).slice(0, 200),
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

/** Replaces every {token} in `str` with vars[token] — unknown tokens are left as-is. */
export function fillNocTemplate(str, vars) {
  return String(str ?? "").replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key] ?? "") : m));
}
