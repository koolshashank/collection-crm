/**
 * Pure helpers mirroring dashboard.php's PHP functions
 * (fmt_inr, fmt_num, kpi_val, dpd_bucket_count, monthly slot builder).
 */

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nf(n, d = 0) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* PHP fmt_inr() */
export function fmtInr(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return "₹" + nf(n / 1e7, 2) + " Cr";
  if (n >= 1e5) return "₹" + nf(n / 1e5, 2) + " L";
  if (n >= 1e3) return "₹" + nf(n / 1e3, 1) + "K";
  return "₹" + nf(n, 0);
}

/* PHP fmt_num() */
export function fmtNum(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return nf(n / 1e6, 1) + "M";
  if (n >= 1e3) return nf(n / 1e3, 1) + "K";
  return nf(n, 0);
}

export function isNumeric(v) {
  return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
}

export function numberFormat(v) {
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/* PHP kpi_val() — first non-empty key from the cards payload */
export function kpiVal(cards, ...keys) {
  for (const k of keys) {
    const v = cards?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/* PHP dpd_bucket_count() — bucket count from summary.dpdBucketDistribution */
export function dpdBucketCount(summary, bucketKey) {
  for (const b of summary?.dpdBucketDistribution ?? []) {
    if ((b?.bucket ?? "") === bucketKey) return b?.count ?? null;
  }
  return null;
}

/**
 * PHP monthly-collection slot builder: m_7 … m_1 then current_month,
 * with Mon-yy / Mon / "Month YYYY" labels for the last 8 months.
 */
export function buildMonthlyData(result) {
  if (!result || typeof result !== "object") return [];
  const slots = [
    ["m_7", 7], ["m_6", 6], ["m_5", 5], ["m_4", 4],
    ["m_3", 3], ["m_2", 2], ["m_1", 1], ["current_month", 0],
  ];
  const now = new Date();
  return slots.map(([key, off]) => {
    const d = new Date(now.getFullYear(), now.getMonth() - off, 1);
    return {
      label: `${MONTHS_SHORT[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`,
      short: MONTHS_SHORT[d.getMonth()],
      full: `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`,
      val: Math.round(Number(result[key] ?? 0)),
    };
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

/* PHP date('l, d F Y') */
export function longToday() {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
