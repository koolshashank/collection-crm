/**
 * lib/leadScoring.js — "Smart Prioritization" rule-based scoring.
 *
 * This is a transparent, explainable heuristic — NOT a trained ML model.
 * There is no labeled historical-outcome data or training/serving
 * infrastructure anywhere in this project, so a real predictive model
 * isn't buildable here. Every input below is a field already flowing
 * through the app (see components/leads/leadUtils.js's dpdBucketInfo()/
 * statusMeta() and components/client-info/helpers.js's getPriority(),
 * the direct precedents this extends). Pure functions — no fs/network —
 * safe to call from client components.
 *
 * Score (0-100) answers "how much is it worth an agent's time to work
 * this account today" — it blends how overdue+engaged the account is
 * (propensity signals) with how much is at stake (impact), NOT just raw
 * days-past-due. Already-resolved accounts always score 0.
 */

// Word-boundary + exact terminal words only — "recover" alone would also
// match "Recovery Pending"/"Recovering"/"Under Recovery" etc., which mean
// the account is still ACTIVE, not resolved. Same tightened logic for "settl".
const RESOLVED_STATUS_RE = /\b(recovered|settled|closed)\b/i;
const NOT_RESOLVED_STATUS_RE = /not[\s-]*recovered/i; // "Not Recovered" contains "Recovered" but is still active

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ordinal(day) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

function bandFor(score) {
  if (score >= 70) return { band: "Critical", color: "#d64545" };
  if (score >= 50) return { band: "High", color: "#e67e22" };
  if (score >= 30) return { band: "Medium", color: "#e8a33d" };
  return { band: "Low", color: "#1E7E5E" };
}

function dpdUrgency(dpd) {
  const d = Number(dpd);
  if (!Number.isFinite(d) || d <= 0) return 10; // nothing overdue yet — low priority
  if (d <= 30) return 60; // most actionable window for a recovery call
  if (d <= 60) return 50;
  if (d <= 90) return 40;
  if (d <= 180) return 25;
  return 15; // very stale — usually better suited to legal/write-off than routine calling
}

function amountImpact(amount) {
  const n = Number(amount) || 0;
  return clamp(n / 100000, 0, 1) * 15; // up to 15pts, scaled against ₹1L reference
}

function isResolved(row) {
  const status = String(row?.payment_status ?? row?.loan_status ?? "");
  if (NOT_RESOLVED_STATUS_RE.test(status)) return false;
  return RESOLVED_STATUS_RE.test(status);
}

function isPartialPayer(row) {
  // "part" alone would also match unrelated words (e.g. "Counterparty") —
  // require the actual phrase, same tightened approach as RESOLVED_STATUS_RE.
  return /part\s*pay/i.test(String(row?.payment_status ?? ""));
}

function isReloan(row) {
  const v = row?.is_reloan_case;
  return v === true || v === "true" || v === 1 || v === "1";
}

/** Zero-padded, directly usable as a lexicographic sort key alongside this app's string-compare sort. */
export function toSortableScore(score) {
  return String(Math.round(score)).padStart(3, "0");
}

/**
 * Bulk-list score — computed from fields already present on a single
 * Leads/Portfolio list row, zero extra API calls.
 */
export function scoreListRow(row) {
  if (isResolved(row)) {
    return { score: 0, scoreStr: toSortableScore(0), band: "Resolved", color: "#6c757d" };
  }

  const amount = row?.repayment_amount ?? row?.balance_claim_amount ?? row?.principal_outstanding ?? row?.sanction_amount;
  let score = dpdUrgency(row?.dpd);
  if (isReloan(row)) score += 12;
  if (isPartialPayer(row)) score += 13;
  score += amountImpact(amount);
  score = clamp(Math.round(score), 0, 100);

  return { score, scoreStr: toSortableScore(score), ...bandFor(score) };
}

/**
 * Per-lead score for the client-info "Recommended Approach" card —
 * extends scoreListRow with payment recency, PTP follow-through, a
 * recommended contact channel, and a recommended contact window.
 */
export function scoreLeadDetail({ loan = {}, payments = [], ptps = [], timeline = [] } = {}) {
  const base = scoreListRow({
    dpd: loan?.dpd ?? loan?.overdue_days,
    payment_status: loan?.payment_status ?? loan?.loan_status,
    is_reloan_case: loan?.is_reloan_case,
    repayment_amount: loan?.repayment_amount,
    balance_claim_amount: loan?.balance_claim_amount ?? loan?.principal_outstanding,
    sanction_amount: loan?.sanction_amount,
  });

  const reasons = [];
  let score = base.score;

  if (base.band === "Resolved") {
    return { ...base, recommendedChannel: null, recommendedWindow: null, reasons: ["Account already closed/settled/recovered"] };
  }

  const dpd = Number(loan?.dpd ?? loan?.overdue_days);
  if (Number.isFinite(dpd) && dpd > 0) reasons.push(`${dpd} days overdue`);
  if (isReloan(loan)) reasons.push("Reloan customer — proven repayment history");
  if (isPartialPayer(loan)) reasons.push("Currently making partial payments");

  /* Recency: paid within the last 30 days → actively engaged */
  const lastPaymentDate = payments
    .map((p) => new Date(p?.payment_date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => b - a)[0];
  if (lastPaymentDate) {
    const daysSince = Math.round((Date.now() - lastPaymentDate.getTime()) / 86400000);
    if (daysSince <= 30) {
      score += 10;
      reasons.push(`Paid within the last ${daysSince} day${daysSince === 1 ? "" : "s"}`);
    }
  }

  /* PTP follow-through: an upcoming promise is a warm lead; a promise with
     no payment in the ~10 days after it suggests a broken commitment. */
  const now = Date.now();
  let hasUpcomingPtp = false;
  let hasBrokenPtp = false;
  for (const p of ptps) {
    const ptpDate = new Date(p?.ptp_date);
    if (isNaN(ptpDate.getTime())) continue;
    if (ptpDate.getTime() > now) {
      hasUpcomingPtp = true;
      continue;
    }
    const windowEnd = ptpDate.getTime() + 10 * 86400000;
    const kept = payments.some((pay) => {
      const d = new Date(pay?.payment_date);
      return !isNaN(d.getTime()) && d.getTime() >= ptpDate.getTime() && d.getTime() <= windowEnd;
    });
    if (!kept && windowEnd < now) hasBrokenPtp = true;
  }
  if (hasUpcomingPtp) {
    score += 10;
    reasons.push("Has an active promise-to-pay coming up");
  } else if (hasBrokenPtp) {
    score -= 8;
    reasons.push("Past promise-to-pay wasn't kept");
  }

  score = clamp(Math.round(score), 0, 100);

  /* Recommended channel: least-recently-used channel already seen in the
     activity timeline (avoid repeat-fatigue); default to WhatsApp — the
     cheapest, least-intrusive first touch — when there's no history. */
  const channelCounts = new Map();
  for (const t of timeline) {
    const ch = String(t?.channel ?? "").trim();
    if (!ch) continue;
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
  }
  let recommendedChannel = "WhatsApp";
  if (channelCounts.size > 0) {
    recommendedChannel = [...channelCounts.entries()].sort((a, b) => a[1] - b[1])[0][0];
  }

  /* Recommended window: shortly after the borrower's salary date, when
     they're most likely to have cash on hand — the only real timing
     signal present in this data. */
  const salaryRaw = loan?.fixed_salary_date ?? loan?.salary_date_ist ?? loan?.salary_date;
  let recommendedWindow = "Business hours, any weekday";
  const salaryDate = salaryRaw ? new Date(salaryRaw) : null;
  if (salaryDate && !isNaN(salaryDate.getTime())) {
    recommendedWindow = `Around the ${ordinal(salaryDate.getDate())} of the month, just after salary credit`;
  }

  return { score, scoreStr: toSortableScore(score), ...bandFor(score), recommendedChannel, recommendedWindow, reasons };
}
