/**
 * lib/reportsMock.js — mock data layer for the Reports page.
 *
 * TODO(api): the real reports API hasn't been provided yet. Every function
 * below returns the shape a real endpoint would (stats, tables, series),
 * computed internally-consistently (totals are real sums of the rows, not
 * separately hardcoded numbers) so swapping these for real `clientFetch`
 * calls later shouldn't require touching any component — same pattern as
 * lib/settlementMock.js.
 */

const DELAY_MS = 300;
function delay(ms = DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const REPORT_TYPES = [
  { key: "collection_summary", label: "Collection Summary" },
  { key: "recovery_summary", label: "Recovery Summary" },
  { key: "dpd_analysis", label: "DPD Analysis" },
  { key: "credit_person_par", label: "Credit Person PAR" },
];

export const TEAM_OPTIONS = ["All Teams", "Collection Head", "Collection Executive", "Recovery Head", "Recovery Executive"];
export const SOURCE_OPTIONS = ["All Sources", "Fresh", "Reloan"];

/* ── Headline stat cards — shared across every report type ── */
export async function getReportStats() {
  await delay();
  return {
    success: true,
    stats: {
      totalCollected: { value: 139200000, trend: 8.6 },
      totalRecovered: { value: 71800000, trend: 7.2 },
      outstanding: { value: 67400000, trend: 4.1, badWhenUp: true },
      casesClosed: { value: 2356, trend: 11.3 },
      overdueCases: { value: 1754, trend: -5.6, badWhenUp: true },
    },
  };
}

/* ── Collection Summary — team-wise breakdown table ── */
export async function getCollectionSummary() {
  await delay();
  const teams = [
    { team: "Collection Head", totalCases: 4521, totalOutstanding: 24500000, collected: 12500000, recovered: 6800000, overdueCases: 512 },
    { team: "Collection Executive", totalCases: 6245, totalOutstanding: 31000000, collected: 17000000, recovered: 9200000, overdueCases: 824 },
    { team: "Recovery Head", totalCases: 1854, totalOutstanding: 10500000, collected: 5500000, recovered: 3800000, overdueCases: 216 },
    { team: "Recovery Executive", totalCases: 986, totalOutstanding: 5400000, collected: 2200000, recovered: 2000000, overdueCases: 142 },
  ].map((r) => ({
    ...r,
    collectionPct: Math.round((r.collected / r.totalOutstanding) * 1000) / 10,
    recoveryPct: Math.round((r.recovered / r.collected) * 1000) / 10,
  }));

  const total = teams.reduce(
    (acc, r) => ({
      totalCases: acc.totalCases + r.totalCases,
      totalOutstanding: acc.totalOutstanding + r.totalOutstanding,
      collected: acc.collected + r.collected,
      recovered: acc.recovered + r.recovered,
      overdueCases: acc.overdueCases + r.overdueCases,
    }),
    { totalCases: 0, totalOutstanding: 0, collected: 0, recovered: 0, overdueCases: 0 }
  );
  total.collectionPct = Math.round((total.collected / total.totalOutstanding) * 1000) / 10;
  total.recoveryPct = Math.round((total.recovered / total.collected) * 1000) / 10;

  return { success: true, rows: teams, total };
}

/* ── Recovery Summary — trend line + status breakdown ── */
export async function getRecoverySummary() {
  await delay();
  const totalRecovered = 71800000;
  const dailyShape = [0.5, 0.62, 0.48, 0.7, 0.55, 0.66, 0.6, 0.75, 0.58, 0.68, 0.8, 0.62, 0.7, 0.85, 0.66, 0.78, 0.9, 0.72];
  const shapeSum = dailyShape.reduce((s, v) => s + v, 0);
  const startDate = new Date("2026-08-01");
  const trend = dailyShape.map((v, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return { date: d, amount: Math.round((v / shapeSum) * totalRecovered * 0.16) }; // ~16% of range recovered daily on average, scaled by shape
  });

  const statusShares = [
    { status: "Recovered", pct: 52, color: "#1E7E5E" },
    { status: "Part Payment", pct: 18, color: "#e8a33d" },
    { status: "Not Recovered", pct: 22, color: "#d64545" },
    { status: "Settled", pct: 8, color: "#3b6ea5" },
  ];
  const totalCases = 13606;
  const rows = statusShares.map((s) => {
    const cases = Math.round((s.pct / 100) * totalCases);
    const amount = Math.round((s.pct / 100) * totalRecovered);
    return { ...s, cases, amount, avgPerCase: Math.round(amount / cases) };
  });

  return {
    success: true,
    trend,
    totalRecovered,
    breakdown: rows,
    totalCases: rows.reduce((s, r) => s + r.cases, 0),
    totalAmount: rows.reduce((s, r) => s + r.amount, 0),
  };
}

/* ── DPD Analysis — bucket distribution ── */
export async function getDpdAnalysis() {
  await delay();
  const totalCases = 13606;
  const defs = [
    { label: "0 - 30 DPD", pct: 53, avgTicket: 3200, color: "#1E7E5E" },
    { label: "31 - 60 DPD", pct: 16, avgTicket: 10600, color: "#e8a33d" },
    { label: "61 - 90 DPD", pct: 10, avgTicket: 11900, color: "#d97706" },
    { label: "91 - 120 DPD", pct: 8, avgTicket: 12800, color: "#ea580c" },
    { label: "121 - 150 DPD", pct: 6, avgTicket: 13400, color: "#dc2626" },
    { label: "151 - 180 DPD", pct: 4, avgTicket: 14100, color: "#b91c1c" },
    { label: "180+ DPD", pct: 3, avgTicket: 15500, color: "#7f1d1d" },
  ];
  const buckets = defs.map((d) => {
    const cases = Math.round((d.pct / 100) * totalCases);
    return { ...d, cases, outstanding: cases * d.avgTicket };
  });
  const total = {
    cases: buckets.reduce((s, b) => s + b.cases, 0),
    outstanding: buckets.reduce((s, b) => s + b.outstanding, 0),
  };

  return { success: true, buckets, total };
}

/* ── Credit Person-wise PAR Analysis — which sanctioning (credit) officer's
   loans end up overdue (Portfolio At Risk) the most, so risky sanctioning
   patterns can be flagged back to that person/team. ── */
export async function getCreditPersonPar() {
  await delay();
  const rows = [
    { name: "Rohit Malhotra", totalCases: 1842, parCases: 612, sanctionAmt: 68000000 },
    { name: "Ankita Sharma", totalCases: 2104, parCases: 505, sanctionAmt: 79500000 },
    { name: "Suresh Nair", totalCases: 1560, parCases: 351, sanctionAmt: 54200000 },
    { name: "Priya Deshmukh", totalCases: 1988, parCases: 398, sanctionAmt: 71800000 },
    { name: "Vikram Chauhan", totalCases: 1320, parCases: 211, sanctionAmt: 46500000 },
    { name: "Neha Kapoor", totalCases: 1725, parCases: 224, sanctionAmt: 61200000 },
    { name: "Amitabh Rao", totalCases: 980, parCases: 108, sanctionAmt: 34500000 },
    { name: "Kavya Iyer", totalCases: 1456, parCases: 131, sanctionAmt: 51600000 },
    { name: "Rajesh Verma", totalCases: 2245, parCases: 179, sanctionAmt: 82300000 },
    { name: "Sanjana Bhatt", totalCases: 1102, parCases: 66, sanctionAmt: 38900000 },
  ]
    .map((r) => {
      const parPct = Math.round((r.parCases / r.totalCases) * 1000) / 10;
      const avgTicket = Math.round(r.sanctionAmt / r.totalCases);
      // ~82% of a PAR case's original ticket is typically still outstanding on average
      const parOutstanding = Math.round(r.parCases * avgTicket * 0.82);
      return { ...r, parPct, avgTicket, parOutstanding };
    })
    .sort((a, b) => b.parPct - a.parPct);

  const total = rows.reduce(
    (acc, r) => ({
      totalCases: acc.totalCases + r.totalCases,
      parCases: acc.parCases + r.parCases,
      sanctionAmt: acc.sanctionAmt + r.sanctionAmt,
      parOutstanding: acc.parOutstanding + r.parOutstanding,
    }),
    { totalCases: 0, parCases: 0, sanctionAmt: 0, parOutstanding: 0 }
  );
  total.parPct = Math.round((total.parCases / total.totalCases) * 1000) / 10;

  return { success: true, rows, total };
}
