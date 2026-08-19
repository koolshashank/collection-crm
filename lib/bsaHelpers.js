/**
 * Formatting helpers for the BSA (Bank Statement Analysis) report —
 * mirrors the inr()/n()/ms2d()/sv() helpers from the legacy bsa.php page
 * so the numbers render identically (₹ Cr/L/K shorthand, dd Mon yyyy dates).
 */

export function sv(v, dash = "—") {
  return v !== null && v !== undefined && v !== "" ? String(v) : dash;
}

export function inr(v, dash = "—") {
  if (v === null || v === undefined || v === "") return dash;
  const n = Number(v);
  if (Number.isNaN(n)) return dash;
  if (n === 0) return "₹0";
  const abs = Math.abs(n);
  if (abs >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function n(v, d = 0, dash = "—") {
  if (v === null || v === undefined || v === "") return dash;
  const num = Number(v);
  if (Number.isNaN(num)) return dash;
  return num.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function ms2d(ms) {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Chart-axis label shorthand (no ₹ decimals, k/L/Cr suffix) — mirrors the inline JS inr() in bsa.php. */
export function inrShort(v) {
  if (v === null || v === undefined) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return "—";
  const abs = Math.abs(num);
  if (abs >= 1e7) return "₹" + (num / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return "₹" + (num / 1e5).toFixed(1) + " L";
  if (abs >= 1e3) return "₹" + Math.round(num / 1e3) + "K";
  return "₹" + num;
}

/**
 * Parse the raw BSA API payload into the exact shape the report needs.
 * Matches bsa.php's `data[0].api_response.apimsg.data[0]` traversal.
 */
const EMPTY_BSA = {
  root: null,
  grandRow: null,
  camGrand: null,
  monthlyRows: [],
  salaryMonths: [],
  allTxns: [],
  bounceMths: [],
  cam: {},
  recurIncome: [],
  recurExpense: [],
  fraudHits: [],
  totalBounceEvents: 0,
  charts: { cLabels: [], cSal: [], cCr: [], cDr: [], cAvg: [], bLabels: [], bCounts: [] },
};

export function parseBsaPayload(apiData) {
  const root = apiData?.data?.[0]?.api_response?.apimsg?.data?.[0] ?? null;
  if (!root) return EMPTY_BSA;

  const analysisData = root.analysisData ?? [];
  const grandRow = analysisData.find((r) => (r.month ?? "") === "Grand Total") ?? null;
  const monthlyRows = analysisData.filter((r) => (r.month ?? "") !== "Grand Total");

  const camMonthly = root.camAnalysisData?.camAnalysisMonthly ?? [];
  const camGrand = camMonthly.find((r) => (r.month ?? "") === "Grand Total") ?? null;

  const salaryMonths = root.salary ?? [];
  const allTxns = root.transactions ?? [];
  const bounceMths = root.chequeBounces ?? [];
  const cam = root.camAnalysisData ?? {};
  const recurIncome = root.recurringIncome ?? [];
  const recurExpense = root.recurringExpense ?? [];
  const fraudHits = (root.fraudIndicators ?? []).filter((f) => (f.transactions ?? []).length > 0);

  const totalBounceEvents = bounceMths.reduce((sum, bm) => sum + (bm.transactions?.length ?? 0), 0);

  const cLabels = [];
  const cSal = [];
  const cCr = [];
  const cDr = [];
  const cAvg = [];
  monthlyRows.forEach((mr) => {
    cLabels.push(mr.month);
    cSal.push(Number(mr.salaryAmount ?? 0));
    cCr.push(Number(mr.creditTransactionsAmount ?? 0));
    cDr.push(Number(mr.debitTransactionsAmount ?? 0));
    cAvg.push(Number(mr.averageEODBalance ?? 0));
  });

  const bLabels = [];
  const bCounts = [];
  bounceMths.forEach((bm) => {
    bLabels.push(bm.month);
    bCounts.push(bm.transactions?.length ?? 0);
  });

  return {
    root,
    grandRow,
    camGrand,
    monthlyRows,
    salaryMonths,
    allTxns,
    bounceMths,
    cam,
    recurIncome,
    recurExpense,
    fraudHits,
    totalBounceEvents,
    charts: { cLabels, cSal, cCr, cDr, cAvg, bLabels, bCounts },
  };
}
