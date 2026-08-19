import { createPdfDoc, stampHeaderFooter, drawLogo, NAVY, MARGIN, today_dMY } from "../pdfDocKit";
import { readNdcTemplate, fillNdcTemplate } from "../ndcTemplate";

/**
 * Builds the No Dues Certificate (NDC) PDF and returns a Node Buffer.
 * Structurally a close sibling of lib/noc/pdf.js — same layout constants,
 * same header/footer/logo — but its own admin-editable template (Settings
 * → Communication → NDC Template) since the wording differs: NDC confirms
 * a *settled* account, not one repaid in full.
 *
 * @param {object} p
 * @param {string} p.loanNo
 * @param {string} p.borrowerName
 * @param {string} [p.pan]
 * @param {string} [p.ndcDateDisp]
 * @param {string} p.settleDateDisp
 * @param {string} p.settleAmtDisp
 * @param {string} p.waiverAmtDisp
 * @param {string} [p.remarks]
 * @param {object} [p.template]   Draft template override (preview)
 */
export function buildNdcPdf({ loanNo, borrowerName, pan, ndcDateDisp, settleDateDisp, settleAmtDisp, waiverAmtDisp, remarks, template }) {
  const tpl = template || readNdcTemplate();
  const dateDisp = ndcDateDisp || today_dMY();
  const vars = { loanNo, borrowerName, pan: pan || "", ndcDateDisp: dateDisp, settleDateDisp, settleAmtDisp, waiverAmtDisp, remarks: remarks || "" };
  const fill = (s) => fillNdcTemplate(s, vars);

  const kit = createPdfDoc();
  const { doc, setFont, cell, multiCell } = kit;
  const mm = (pt) => pt * (25.4 / 72);

  /* TITLE */
  setFont("bold", 13, NAVY);
  const title = tpl.title;
  cell(9, title, "C", MARGIN, 13);
  const tw = doc.getTextWidth(title);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.3);
  doc.line(105 - tw / 2, kit.getY() - 1.6, 105 + tw / 2, kit.getY() - 1.6);
  kit.setY(kit.getY() + 4);

  /* META */
  const metaRow = (label, val) => {
    setFont("bold", 9.5, NAVY);
    doc.text(label, MARGIN, kit.getY() + 3 + mm(9.5) * 0.36);
    setFont("normal", 9.5, [30, 30, 30]);
    doc.text(String(val), MARGIN + 50, kit.getY() + 3 + mm(9.5) * 0.36);
    kit.setY(kit.getY() + 6);
  };
  metaRow("Loan Account No. :", loanNo);
  if (pan) metaRow("PAN :", pan);
  metaRow("Date :", dateDisp);
  kit.setY(kit.getY() + 5);

  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, kit.getY(), 210 - MARGIN, kit.getY());
  kit.setY(kit.getY() + 5);

  /* SALUTATION */
  setFont("bold", 10, [20, 20, 20]);
  cell(6, fill(tpl.salutation), "L", MARGIN, 10);
  setFont("italic", 9.5, [100, 100, 100]);
  cell(6, tpl.greeting, "L", MARGIN, 9.5);
  kit.setY(kit.getY() + 4);

  /* BODY PARAGRAPHS */
  for (const p of tpl.paragraphs) {
    multiCell(6.5, fill(p), 9.5, "normal", [30, 30, 30]);
    kit.setY(kit.getY() + 3);
  }

  if (remarks) {
    multiCell(6, "Note: " + remarks, 9, "italic", [80, 80, 80]);
    kit.setY(kit.getY() + 3);
  }
  kit.setY(kit.getY() + 6);

  /* REGARDS */
  kit.ensureSpace(40);
  setFont("normal", 9.5, [30, 30, 30]);
  cell(6, tpl.closingRegards, "L", MARGIN, 9.5);
  setFont("bold", 10, NAVY);
  cell(6, tpl.closingTeam, "L", MARGIN, 10);

  kit.setY(drawLogo(doc, kit.getY(), tpl.closingTeam));

  setFont("normal", 9, [60, 60, 60]);
  cell(5, tpl.closingCompany, "L", MARGIN, 9);
  kit.setY(kit.getY() + 8);

  setFont("italic", 7.5, [170, 150, 130]);
  cell(5, "This document is system-generated and does not require a physical signature.   Date: " + dateDisp, "C", MARGIN, 7.5);

  stampHeaderFooter(
    doc,
    (pageNum, pageCount) => `Page ${pageNum}/${pageCount}   |   Loan: ${loanNo}   |   Generated: ${today_dMY()}`
  );

  return Buffer.from(doc.output("arraybuffer"));
}
