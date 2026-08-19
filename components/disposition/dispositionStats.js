import { pick } from "./DispositionTable";

const AMOUNT_KEYS = ["ptp_amount", "ptpAmount"];
const DATE_KEYS = ["ptp_date", "ptpDate"];
const AGENT_KEYS = ["employee_name", "employeeName", "emp_name", "agent_name"];
const LOAN_KEYS = ["loan_no", "loanNo", "loan_id"];
const CREATED_KEYS = ["created_at", "createdAt", "created_on"];

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  const monday = startOfDay(d);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Turns a flat list of disposition rows (all fetched for one code) into
 * everything the detail modal's tabs need. Every number here is derived
 * straight from the rows — nothing is fabricated. `hasAmount`/`hasDate`
 * tell the modal which sections make sense to show (only PTP-style codes
 * carry ptp_amount/ptp_date).
 */
export function computeDispositionStats(rows, { now = new Date() } = {}) {
  const loanNos = new Set();
  const agentCounts = new Map();
  const dayCounts = new Map();
  const weekCounts = new Map();
  const amounts = [];
  const promiseDates = [];

  for (const row of rows) {
    const loanNo = pick(row, LOAN_KEYS);
    if (loanNo) loanNos.add(String(loanNo));

    const agent = pick(row, AGENT_KEYS) || "Unassigned";
    agentCounts.set(agent, (agentCounts.get(agent) || 0) + 1);

    const created = pick(row, CREATED_KEYS);
    if (created) {
      const d = new Date(created);
      if (!Number.isNaN(d.getTime())) {
        dayCounts.set(dayKey(d), (dayCounts.get(dayKey(d)) || 0) + 1);
        const wk = dayKey(startOfWeek(d));
        weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
      }
    }

    const amt = pick(row, AMOUNT_KEYS);
    const amtNum = Number(amt);
    if (amt !== null && Number.isFinite(amtNum) && amtNum > 0) amounts.push(amtNum);

    const pDate = pick(row, DATE_KEYS);
    if (pDate) {
      const d = new Date(pDate);
      if (!Number.isNaN(d.getTime())) promiseDates.push(d);
    }
  }

  const hasAmount = amounts.length > 0;
  const hasDate = promiseDates.length > 0;
  const totalAmount = amounts.reduce((s, n) => s + n, 0);
  const avgAmount = hasAmount ? totalAmount / amounts.length : 0;

  const topAgents = [...agentCounts.entries()]
    .map(([name, count]) => ({ name, count, pct: rows.length ? Math.round((count / rows.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Daily series, last 30 days, zero-filled so gaps read as troughs not blanks.
  const today = startOfDay(now);
  const dailySeries = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailySeries.push({ date: d, count: dayCounts.get(dayKey(d)) || 0 });
  }

  // Weekly series, last 12 weeks, zero-filled.
  const weeklySeries = [];
  const thisWeekStart = startOfWeek(now);
  for (let i = 11; i >= 0; i--) {
    const wkStart = new Date(thisWeekStart);
    wkStart.setDate(wkStart.getDate() - i * 7);
    weeklySeries.push({ weekStart: wkStart, count: weekCounts.get(dayKey(wkStart)) || 0 });
  }

  const bucketDefs = [
    { key: "0-2k", label: "₹0 – 2K", test: (n) => n < 2000 },
    { key: "2-5k", label: "₹2K – 5K", test: (n) => n >= 2000 && n < 5000 },
    { key: "5-10k", label: "₹5K – 10K", test: (n) => n >= 5000 && n < 10000 },
    { key: "10k+", label: "₹10K+", test: (n) => n >= 10000 },
  ];
  const amountBuckets = bucketDefs.map((b) => ({ ...b, count: amounts.filter(b.test).length }));

  // Promise-date groups, relative to "now".
  const promiseGroups = { overdue: 0, today: 0, tomorrow: 0, thisWeek: 0, later: 0 };
  for (const d of promiseDates) {
    const diffDays = Math.round((startOfDay(d) - today) / 86400000);
    if (diffDays < 0) promiseGroups.overdue++;
    else if (diffDays === 0) promiseGroups.today++;
    else if (diffDays === 1) promiseGroups.tomorrow++;
    else if (diffDays <= 7) promiseGroups.thisWeek++;
    else promiseGroups.later++;
  }

  const recent = [...rows]
    .sort((a, b) => {
      const da = new Date(pick(a, CREATED_KEYS) || 0).getTime();
      const db = new Date(pick(b, CREATED_KEYS) || 0).getTime();
      return db - da;
    })
    .slice(0, 5);

  return {
    totalRecords: rows.length,
    uniqueLoans: loanNos.size,
    uniqueAgents: agentCounts.size,
    hasAmount,
    hasDate,
    totalAmount,
    avgAmount,
    topAgents,
    dailySeries,
    weeklySeries,
    amountBuckets,
    promiseGroups,
    recent,
  };
}
