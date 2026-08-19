/**
 * Settlement module — mock data layer.
 *
 * TODO(api): everything in this file stands in for the real settlement
 * API, which hasn't been provided yet ("API mai baad me dunga"). Every
 * function below returns the exact shape a real endpoint would, and
 * `normalizeSettlement` maps fields the same way settlement.php's own
 * `norm()` did — so swapping the bodies of these functions for real
 * `clientFetch` calls later shouldn't require touching any component.
 */

const DELAY_MS = 350;

function delay(ms = DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let idSeq = 100;
function nextId() {
  idSeq += 1;
  return idSeq;
}

function isoNow() {
  return new Date().toISOString();
}

/** Same field mapping as settlement.php's norm(), camelCased. */
export function normalizeSettlement(r) {
  return {
    id: r.id,
    loanNo: r.loan_no || "",
    leadId: r.lead_id || "",
    borrowerName: r.borrower_name || "",
    mobile: r.mobile || "",
    email: r.email || "",
    pan: r.pan || "",
    loanAmt: Number(r.loan_amt) || 0,
    outstanding: Number(r.outstanding) || 0,
    settleAmt: Number(r.settle_amt) || 0,
    waiver: Number(r.waiver) || 0,
    dpd: parseInt(r.dpd, 10) || 0,
    settleType: r.settle_type || "OTS",
    settleDate: r.settle_date || "",
    reason: r.reason || "",
    notes: r.notes || "",
    raisedBy: r.raised_by || "",
    raisedByEmpId: String(r.raised_by_id || ""),
    raisedOn: r.raised_on || "",
    status: r.status || "pending",
    adminRemarks: r.admin_remarks || "",
    decidedBy: r.decided_by || "",
    decidedOn: r.decided_on || "",
    letterSent: !!r.letter_sent,
    letterSentOn: r.letter_sent_on || "",
    letterSentTo: r.letter_sent_to || "",
    ndcSent: !!r.ndc_sent,
    ndcSentOn: r.ndc_sent_on || "",
    ndcSentTo: r.ndc_sent_to || "",
  };
}

function seedRow(overrides) {
  return normalizeSettlement({
    id: nextId(),
    ...overrides,
  });
}

/* In-memory seed — spans pending/approved/rejected/letter-sent across a
   couple of different agents so every tab has something to show. */
let SETTLEMENTS = [
  seedRow({
    loan_no: "BLKR00021946", lead_id: "L21946", borrower_name: "Ramesh Kumar Yadav",
    mobile: "9876543210", email: "ramesh.yadav@example.com", pan: "ABCPY1234K",
    loan_amt: 150000, outstanding: 98500, settle_amt: 72000, waiver: 26500, dpd: 142,
    settle_type: "OTS", settle_date: "2026-08-20",
    reason: "Customer lost job in Mar-2026, offered lump-sum via family support.",
    raised_by: "Anita Sharma", raised_by_id: "E1042", raised_on: "2026-08-05T10:12:00Z",
    status: "pending",
  }),
  seedRow({
    loan_no: "BLKR00019221", lead_id: "L19221", borrower_name: "Sunita Devi",
    mobile: "9123456780", email: "sunita.devi@example.com", pan: "AXBPD5566L",
    loan_amt: 80000, outstanding: 61200, settle_amt: 45000, waiver: 16200, dpd: 96,
    settle_type: "Partial", settle_date: "2026-08-18",
    reason: "Partial recovery likely; customer relocated, hard to trace for full amount.",
    raised_by: "Anita Sharma", raised_by_id: "E1042", raised_on: "2026-08-07T09:40:00Z",
    status: "pending",
  }),
  seedRow({
    loan_no: "BLKR00017788", lead_id: "L17788", borrower_name: "Mohd. Irfan",
    mobile: "9988776655", email: "irfan.m@example.com", pan: "AZQPI7788M",
    loan_amt: 200000, outstanding: 145000, settle_amt: 120000, waiver: 25000, dpd: 210,
    settle_type: "OTS", settle_date: "2026-07-30",
    reason: "High DPD, customer proposing one-time payment through relative.",
    raised_by: "Vikas Rana", raised_by_id: "E1077", raised_on: "2026-07-22T12:05:00Z",
    status: "approved", admin_remarks: "Approved — recovery probability was declining fast.",
    decided_by: "Admin", decided_on: "2026-07-24T08:15:00Z",
  }),
  seedRow({
    loan_no: "BLKR00015532", lead_id: "L15532", borrower_name: "Priya Menon",
    mobile: "9012345678", email: "priya.menon@example.com", pan: "AABPM3321N",
    loan_amt: 60000, outstanding: 42000, settle_amt: 35000, waiver: 7000, dpd: 65,
    settle_type: "Full", settle_date: "2026-07-15",
    reason: "Customer cleared most dues, small waiver requested on penalty.",
    raised_by: "Vikas Rana", raised_by_id: "E1077", raised_on: "2026-07-05T14:22:00Z",
    status: "approved", admin_remarks: "Approved — genuine hardship case.",
    decided_by: "Admin", decided_on: "2026-07-06T09:00:00Z",
    letter_sent: true, letter_sent_on: "2026-07-06T11:30:00Z", letter_sent_to: "priya.menon@example.com",
  }),
  seedRow({
    loan_no: "BLKR00013309", lead_id: "L13309", borrower_name: "Deepak Chauhan",
    mobile: "9876501234", email: "deepak.c@example.com", pan: "ABBPC9987P",
    loan_amt: 100000, outstanding: 88000, settle_amt: 40000, waiver: 48000, dpd: 178,
    settle_type: "OTS", settle_date: "2026-06-28",
    reason: "Requested waiver too high relative to recovery history.",
    raised_by: "Anita Sharma", raised_by_id: "E1042", raised_on: "2026-06-18T16:45:00Z",
    status: "rejected", admin_remarks: "Rejected — waiver disproportionate, renegotiate with customer.",
    decided_by: "Admin", decided_on: "2026-06-20T10:10:00Z",
  }),
  seedRow({
    loan_no: "BLKR00011200", lead_id: "L11200", borrower_name: "Kavita Joshi",
    mobile: "9765432109", email: "kavita.joshi@example.com", pan: "AACPJ4432Q",
    loan_amt: 120000, outstanding: 95000, settle_amt: 70000, waiver: 25000, dpd: 155,
    settle_type: "OTS", settle_date: "2026-06-10",
    reason: "Customer's business shut down, offering settlement via loan from relative.",
    raised_by: "Vikas Rana", raised_by_id: "E1077", raised_on: "2026-05-28T11:00:00Z",
    status: "approved", admin_remarks: "Approved.",
    decided_by: "Admin", decided_on: "2026-05-30T09:30:00Z",
    letter_sent: true, letter_sent_on: "2026-05-30T13:00:00Z", letter_sent_to: "kavita.joshi@example.com",
  }),
  seedRow({
    loan_no: "BLKR00009944", lead_id: "L9944", borrower_name: "Rahul Verma",
    mobile: "9654321098", email: "rahul.verma@example.com", pan: "AADPV1123R",
    loan_amt: 90000, outstanding: 52000, settle_amt: 38000, waiver: 14000, dpd: 48,
    settle_type: "Partial", settle_date: "2026-08-22",
    reason: "Customer proposes settlement to close account before job relocation.",
    raised_by: "Anita Sharma", raised_by_id: "E1042", raised_on: "2026-08-10T08:50:00Z",
    status: "pending",
  }),
];

/* ── Public API (mock — swap internals for real fetch calls later) ── */

export async function fetchSettlements() {
  await delay();
  return { success: true, rows: SETTLEMENTS.slice() };
}

export async function raiseSettlementRequest(payload) {
  await delay();
  const row = seedRow({
    loan_no: payload.loanNo,
    lead_id: payload.leadId || "",
    borrower_name: payload.borrowerName,
    mobile: payload.mobile,
    email: payload.email,
    pan: payload.pan,
    loan_amt: payload.loanAmt,
    outstanding: payload.outstanding,
    settle_amt: payload.settleAmt,
    waiver: payload.waiver,
    dpd: payload.dpd,
    settle_type: payload.settleType,
    settle_date: payload.settleDate,
    reason: payload.reason,
    notes: payload.notes,
    raised_by: payload.raisedBy,
    raised_by_id: payload.raisedByEmpId,
    raised_on: isoNow(),
    status: "pending",
  });
  SETTLEMENTS = [row, ...SETTLEMENTS];
  return { success: true, row };
}

export async function decideSettlement(id, decision, remarks, actorName) {
  await delay();
  let updated = null;
  SETTLEMENTS = SETTLEMENTS.map((row) => {
    if (row.id !== id) return row;
    updated = {
      ...row,
      status: decision,
      adminRemarks: remarks || "",
      decidedBy: actorName || "Admin",
      decidedOn: isoNow(),
    };
    return updated;
  });
  if (!updated) return { success: false, message: "Request not found." };
  return { success: true, row: updated };
}

/** Quick "mark as sent" — settlement-approval's table/detail-modal action,
 * unlike sendSettlementLetter() this collects no email/subject input. */
export async function markLetterSent(id) {
  await delay();
  let updated = null;
  SETTLEMENTS = SETTLEMENTS.map((row) => {
    if (row.id !== id) return row;
    updated = {
      ...row,
      letterSent: true,
      letterSentOn: isoNow(),
      letterSentTo: row.letterSentTo || row.email,
    };
    return updated;
  });
  if (!updated) return { success: false, message: "Request not found." };
  return { success: true, row: updated };
}

export async function sendSettlementLetter(id, email, subject) {
  await delay();
  let updated = null;
  SETTLEMENTS = SETTLEMENTS.map((row) => {
    if (row.id !== id) return row;
    updated = {
      ...row,
      letterSent: true,
      letterSentOn: isoNow(),
      letterSentTo: email,
    };
    return updated;
  });
  if (!updated) return { success: false, message: "Request not found." };
  return { success: true, row: updated, subject };
}

/** Same "mark as sent" bookkeeping as sendSettlementLetter(), for the NDC
 * issued once a settlement has actually been paid off. */
export async function sendNdc(id, email, subject) {
  await delay();
  let updated = null;
  SETTLEMENTS = SETTLEMENTS.map((row) => {
    if (row.id !== id) return row;
    updated = {
      ...row,
      ndcSent: true,
      ndcSentOn: isoNow(),
      ndcSentTo: email,
    };
    return updated;
  });
  if (!updated) return { success: false, message: "Request not found." };
  return { success: true, row: updated, subject };
}

/* Hardcoded sample loans for the Raise-Request loan lookup — includes
   settlement.php's own placeholder (BLKR00021946) plus a couple more.
   Anything else resolves to a generic synthesized demo loan so the flow
   never dead-ends on a "not found" screen. */
const SAMPLE_LOANS = {
  BLKR00021946: {
    loanNo: "BLKR00021946", leadId: "L21946", borrowerName: "Ramesh Kumar Yadav",
    mobile: "9876543210", altMobile: "9811122233", pan: "ABCPY1234K", email: "ramesh.yadav@example.com",
    loanAmt: 150000, outstanding: 98500, repayAmt: 168000, dpd: 142,
    repayDate: "2026-04-15", sanctionDate: "2025-10-15", penalty: 8200,
    loanType: "Personal Loan", tenure: "18 months", status: "NOT CLOSED", isReloan: false,
  },
  BLKR00019221: {
    loanNo: "BLKR00019221", leadId: "L19221", borrowerName: "Sunita Devi",
    mobile: "9123456780", altMobile: "", pan: "AXBPD5566L", email: "sunita.devi@example.com",
    loanAmt: 80000, outstanding: 61200, repayAmt: 92000, dpd: 96,
    repayDate: "2026-05-01", sanctionDate: "2025-11-01", penalty: 4100,
    loanType: "Personal Loan", tenure: "12 months", status: "NOT CLOSED", isReloan: true,
  },
};

function synthesizeLoan(loanNo) {
  const seedNum = Array.from(loanNo).reduce((s, c) => s + c.charCodeAt(0), 0);
  const outstanding = 30000 + (seedNum % 12) * 6500;
  const loanAmt = Math.round(outstanding * 1.6);
  const dpd = 20 + (seedNum % 15) * 9;
  return {
    loanNo, leadId: `L${seedNum}`, borrowerName: "Demo Borrower",
    mobile: "9900112233", altMobile: "", pan: "AAAPD0000Z", email: "demo.borrower@example.com",
    loanAmt, outstanding, repayAmt: Math.round(loanAmt * 1.12), dpd,
    repayDate: "2026-08-01", sanctionDate: "2026-01-01", penalty: Math.round(outstanding * 0.05),
    loanType: "Personal Loan", tenure: "12 months", status: "NOT CLOSED", isReloan: seedNum % 2 === 0,
  };
}

export async function lookupLoanForSettlement(loanNo) {
  await delay(500);
  const key = String(loanNo || "").trim().toUpperCase();
  if (!key) return { success: false, message: "Enter a loan number." };
  const loan = SAMPLE_LOANS[key] || synthesizeLoan(key);
  return { success: true, loan };
}

export const SETTLEMENT_STATUS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
