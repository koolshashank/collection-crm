import { createPdfDoc, stampHeaderFooter, drawLogo, drawKeyValueTable, NAVY, MARGIN, today_dMY } from "../pdfDocKit";
import { readSettlementLetterTemplate, fillSettlementLetterTemplate } from "../settlementLetterTemplate";

/**
 * Builds the Settlement Offer Letter PDF and returns a Node Buffer.
 * Body text (title/salutation/paragraphs/closing + the amounts-table row
 * labels) comes from Settings → Communication → Settlement Letter Template;
 * only the actual figures below are real per-case data.
 *
 * @param {object} p
 * @param {string} p.loanNo
 * @param {string} p.borrowerName
 * @param {string} [p.mobile]
 * @param {string} p.outstandingAmtDisp   Already-formatted "Rs. …" amount
 * @param {string} p.settleType
 * @param {string} p.waiverAmtDisp
 * @param {string} p.settleDateDisp
 * @param {string} p.settleAmtDisp
 * @param {string} [p.letterDateDisp]
 * @param {object} [p.template]           Draft template override (preview)
 */
export function buildSettlementLetterPdf({
  loanNo,
  borrowerName,
  mobile,
  outstandingAmtDisp,
  settleType,
  waiverAmtDisp,
  settleDateDisp,
  settleAmtDisp,
  letterDateDisp,
  template,
}) {
  const tpl = template || readSettlementLetterTemplate();
  const vars = {
    borrowerName,
    loanNo,
    mobile: mobile || "",
    outstandingAmt: outstandingAmtDisp,
    settleType,
    waiverAmt: waiverAmtDisp,
    settleDateDisp,
    settleAmtDisp,
    letterDateDisp: letterDateDisp || today_dMY(),
  };
  const fill = (s) => fillSettlementLetterTemplate(s, vars);

  const kit = createPdfDoc();
  const { doc, setFont, cell, multiCell } = kit;

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
  setFont("bold", 9.5, NAVY);
  doc.text("Loan Account No. :", MARGIN, kit.getY() + 3 + 9.5 * (25.4 / 72) * 0.36);
  setFont("normal", 9.5, [30, 30, 30]);
  doc.text(String(loanNo), MARGIN + 50, kit.getY() + 3 + 9.5 * (25.4 / 72) * 0.36);
  kit.setY(kit.getY() + 6);

  setFont("bold", 9.5, NAVY);
  doc.text("Date :", MARGIN, kit.getY() + 3 + 9.5 * (25.4 / 72) * 0.36);
  setFont("normal", 9.5, [30, 30, 30]);
  doc.text(vars.letterDateDisp, MARGIN + 50, kit.getY() + 3 + 9.5 * (25.4 / 72) * 0.36);
  kit.setY(kit.getY() + 6 + 5);

  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, kit.getY(), 210 - MARGIN, kit.getY());
  kit.setY(kit.getY() + 5);

  /* SALUTATION */
  setFont("bold", 10, [20, 20, 20]);
  cell(6, fill(tpl.salutation), "L", MARGIN, 10);
  setFont("italic", 9.5, [100, 100, 100]);
  cell(6, fill(tpl.greeting), "L", MARGIN, 9.5);
  kit.setY(kit.getY() + 4);

  /* BODY PARAGRAPHS (before the table) */
  for (const p of tpl.paragraphs) {
    multiCell(6.5, fill(p), 9.5, "normal", [30, 30, 30]);
    kit.setY(kit.getY() + 3);
  }

  /* AMOUNTS TABLE */
  drawKeyValueTable(kit, [
    [tpl.tableLabels.outstanding, outstandingAmtDisp],
    [tpl.tableLabels.settleType, settleType],
    [tpl.tableLabels.waiver, waiverAmtDisp],
    [tpl.tableLabels.settleDate, settleDateDisp],
    [tpl.tableLabels.settleAmt, settleAmtDisp],
  ]);

  /* CLOSING PARAGRAPH */
  multiCell(6.5, fill(tpl.closingParagraph), 9.5, "normal", [30, 30, 30]);
  kit.setY(kit.getY() + 9);

  /* REGARDS */
  kit.ensureSpace(40);
  setFont("normal", 9.5, [30, 30, 30]);
  cell(6, tpl.closingRegards, "L", MARGIN, 9.5);
  setFont("bold", 10, NAVY);
  cell(6, tpl.closingTeam, "L", MARGIN, 10);

  kit.setY(drawLogo(doc, kit.getY(), tpl.closingCompany));

  setFont("normal", 9, [60, 60, 60]);
  cell(5, tpl.closingCompany, "L", MARGIN, 9);
  kit.setY(kit.getY() + 8);

  setFont("italic", 7.5, [170, 150, 130]);
  cell(5, "This document is system-generated and does not require a physical signature.   Date: " + vars.letterDateDisp, "C", MARGIN, 7.5);

  stampHeaderFooter(
    doc,
    (pageNum, pageCount) => `Page ${pageNum}/${pageCount}   |   Loan: ${loanNo}   |   Generated: ${today_dMY()}`
  );

  return Buffer.from(doc.output("arraybuffer"));
}
