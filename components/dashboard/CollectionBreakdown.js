"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import Spinner from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";
import { WidgetError } from "./shared";
import Sparkline from "./Sparkline";
import { coInr, coType, isoDate, numberFormat, todayISO } from "@/components/collection/format";
import CollectionDrilldownModal from "./CollectionDrilldownModal";
import TotalCollectionModal from "./TotalCollectionModal";

export const QUICK_RANGES = [
  { label: "Today", days: 1 },
  { label: "Last 7 Days", days: 7 },
  { label: "This Month", days: null }, // handled specially — first of month → today
  { label: "Last 30 Days", days: 30 },
];

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

export function quickRange(q) {
  if (q.days === null) {
    const d = new Date();
    return { startDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, endDate: todayISO() };
  }
  return { startDate: daysAgoISO(q.days - 1), endDate: todayISO() };
}

/** [prevStart, prevEnd] — the period of equal length immediately before `range`. */
function previousPeriod(range) {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const spanMs = end - start;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };
}

function pctChange(curr, prev) {
  if (prev > 0) return Math.round(((curr - prev) / prev) * 1000) / 10;
  return curr > 0 ? 100 : 0;
}

/** Real per-day totals within the range, built from the fetched leads (not fabricated —
    just bucketed from whatever rows the report returned for this period). */
function dailySeries(leads, dateKeys, valueKey, startDate, endDate) {
  const byDay = new Map();
  for (const l of leads) {
    const raw = dateKeys.map((k) => l[k]).find(Boolean);
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = isoDate(d);
    byDay.set(key, (byDay.get(key) || 0) + Number(l[valueKey] ?? 0));
  }
  const out = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end && out.length < 60) {
    out.push(byDay.get(isoDate(cursor)) || 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.length > 1 ? out : [0, 0];
}

/** Same bucketing as dailySeries(), but keeps each point's calendar date
    (for "highest/lowest day" and the This-vs-Previous chart). */
function dailySeriesDated(leads, dateKeys, valueKey, startDate, endDate) {
  const values = dailySeries(leads, dateKeys, valueKey, startDate, endDate);
  const out = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < values.length; i++) {
    out.push({ date: new Date(cursor), value: values[i] });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function Tile({ icon, label, color, amount, count, isMock, isHero, trend, spark, invertTrend, onClick }) {
  const clickable = Boolean(onClick);
  const trendGood = invertTrend ? trend < 0 : trend > 0;
  const trendNeutral = trend === 0;
  return (
    <div
      onClick={onClick}
      className={`card relative overflow-hidden border-t-[3px] px-4 py-4 transition ${
        clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-pop" : ""
      } ${isHero ? "bg-accent-light/30" : ""}`}
      style={{ borderTopColor: color }}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: color + "1a", color }}>
          <CiIcon name={icon} size={11} strokeWidth={2.5} />
        </span>
        <span className="text-[0.67rem] font-bold uppercase tracking-wider text-gray-500">{label}</span>
        {isMock && (
          <span className="ml-auto rounded-full border border-line bg-white px-1.5 py-0.5 text-[0.58rem] font-bold uppercase text-gray-400">
            Est.
          </span>
        )}
      </div>
      <div
        className={`mt-1.5 font-display font-bold leading-none text-gray-800 ${isHero ? "text-3xl" : "text-xl"}`}
        style={isHero ? { color } : undefined}
      >
        {coInr(amount)}
      </div>
      {!trendNeutral && (
        <div
          className={`mt-1 inline-flex items-center gap-0.5 text-[0.68rem] font-bold ${trendGood ? "text-emerald-700" : "text-danger"}`}
        >
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </div>
      )}
      <div className="mt-1.5 h-8">
        <Sparkline values={spark} color={color} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[0.68rem] text-gray-400">
        <span>{numberFormat(count)} cases</span>
        <span>vs previous period</span>
      </div>
    </div>
  );
}

/** Deterministic, total-proportional estimate for the two categories with no live API yet. */
function estimateFreshReloan(totalAmount, totalCustomers) {
  const freshShare = 0.55;
  const freshAmount = Math.round(totalAmount * freshShare);
  const reloanAmount = totalAmount - freshAmount;
  const freshCount = Math.round(totalCustomers * freshShare);
  const reloanCount = totalCustomers - freshCount;
  return {
    fresh: { amount: freshAmount, count: freshCount },
    reloan: { amount: reloanAmount, count: reloanCount },
  };
}

export default function CollectionBreakdown({ range, onRangeChange }) {
  const [state, setState] = useState({ loading: true, error: null, summary: null, leads: [], prevSummary: null, prevLeads: [] });
  const [drilldown, setDrilldown] = useState(null);
  const [totalModalOpen, setTotalModalOpen] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const prev = previousPeriod(range);
    const [currRes, prevRes] = await Promise.all([
      clientFetch(`/api/collection/report?${new URLSearchParams({ startDate: range.startDate, endDate: range.endDate, perPage: "100" })}`),
      clientFetch(`/api/collection/report?${new URLSearchParams({ startDate: prev.startDate, endDate: prev.endDate, perPage: "100" })}`),
    ]);
    if (!currRes.ok || !currRes.data?.success) {
      setState({ loading: false, error: currRes.data?.message || currRes.error || "Could not load collection data.", summary: null, leads: [], prevSummary: null, prevLeads: [] });
      return;
    }
    setState({
      loading: false,
      error: null,
      summary: currRes.data.summary ?? {},
      leads: Array.isArray(currRes.data.leads) ? currRes.data.leads : [],
      prevSummary: prevRes.ok && prevRes.data?.success ? prevRes.data.summary ?? {} : {},
      prevLeads: prevRes.ok && prevRes.data?.success && Array.isArray(prevRes.data.leads) ? prevRes.data.leads : [],
    });
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return (
      <div className="card mb-4 flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
        <Spinner size={20} /> Loading collection amount…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="card mb-4">
        <WidgetError message={state.error} onRetry={load} />
      </div>
    );
  }

  const s = state.summary || {};
  const ps = state.prevSummary || {};
  const total = Number(s.total_collection ?? 0);
  const prevTotal = Number(ps.total_collection ?? 0);
  const totalCustomers = parseInt(s.total_customers ?? 0, 10) || 0;
  const pre = { amount: Number(s.pre_collection ?? 0), count: parseInt(s.pre_customers ?? 0, 10) || 0, prev: Number(ps.pre_collection ?? 0) };
  const ontime = { amount: Number(s.ontime_collection ?? 0), count: parseInt(s.ontime_customers ?? 0, 10) || 0, prev: Number(ps.ontime_collection ?? 0) };
  const post = { amount: Number(s.post_collection ?? 0), count: parseInt(s.post_customers ?? 0, 10) || 0, prev: Number(ps.post_collection ?? 0) };
  const { fresh, reloan } = estimateFreshReloan(total, totalCustomers);
  const prevEstimate = estimateFreshReloan(prevTotal, parseInt(ps.total_customers ?? 0, 10) || 0);

  const leadsByType = (type) =>
    state.leads
      .filter((l) => coType(l) === type)
      .map((l) => ({
        full_name: l.full_name,
        loan_no: l.loan_no,
        amount: Number(l[`${type}_collection`] ?? 0),
        date: l.repayment_date || l.last_collection_date_ist,
      }));

  function mockRows(count, amount) {
    const n = Math.min(count, 8);
    const per = n > 0 ? Math.round(amount / n) : 0;
    return Array.from({ length: n }, (_, i) => ({
      full_name: `Sample Borrower ${i + 1}`,
      loan_no: `BLKR${String(10000 + i).padStart(5, "0")}`,
      amount: per,
      date: range.endDate,
    }));
  }

  const withTotal = (rows) =>
    rows.map((l) => ({
      ...l,
      __total: Number(l.ontime_collection ?? 0) + Number(l.pre_collection ?? 0) + Number(l.post_collection ?? 0),
    }));
  const leadsWithTotal = withTotal(state.leads);
  const totalSpark = dailySeries(leadsWithTotal, ["repayment_date", "last_collection_date_ist"], "__total", range.startDate, range.endDate);

  const totalSparkDated = dailySeriesDated(leadsWithTotal, ["repayment_date", "last_collection_date_ist"], "__total", range.startDate, range.endDate);
  const prev = previousPeriod(range);
  const prevSparkDated = dailySeriesDated(
    withTotal(state.prevLeads),
    ["repayment_date", "last_collection_date_ist"],
    "__total",
    prev.startDate,
    prev.endDate
  );
  const nonZeroDays = totalSparkDated.filter((d) => d.value > 0);
  const dailyAverage = totalSparkDated.length ? total / totalSparkDated.length : 0;
  const highestDay = nonZeroDays.length ? nonZeroDays.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const lowestDay = nonZeroDays.length ? nonZeroDays.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  const tiles = [
    {
      key: "fresh", label: "Fresh", icon: "zap", color: "#9b59b6", ...fresh, isMock: true,
      trend: pctChange(fresh.amount, prevEstimate.fresh.amount),
      spark: totalSpark.map((v) => Math.round(v * 0.55)),
      rows: () => mockRows(fresh.count, fresh.amount),
    },
    {
      key: "reloan", label: "Reloan", icon: "refresh", color: "#c2185b", ...reloan, isMock: true,
      trend: pctChange(reloan.amount, prevEstimate.reloan.amount),
      spark: totalSpark.map((v) => Math.round(v * 0.45)),
      rows: () => mockRows(reloan.count, reloan.amount),
    },
    {
      key: "pre", label: "Prepayment", icon: "clock", color: "#0f9b8e", ...pre, isMock: false,
      trend: pctChange(pre.amount, pre.prev),
      spark: dailySeries(leadsByType("pre").map((r) => ({ date: r.date, v: r.amount })), ["date"], "v", range.startDate, range.endDate),
      rows: () => leadsByType("pre"),
    },
    {
      key: "ontime", label: "On Time", icon: "check", color: "#1E7E5E", ...ontime, isMock: false,
      trend: pctChange(ontime.amount, ontime.prev),
      spark: dailySeries(leadsByType("ontime").map((r) => ({ date: r.date, v: r.amount })), ["date"], "v", range.startDate, range.endDate),
      rows: () => leadsByType("ontime"),
    },
    {
      key: "post", label: "Overdue", icon: "warn", color: "#e8a33d", ...post, isMock: false, invertTrend: true,
      trend: pctChange(post.amount, post.prev),
      spark: dailySeries(leadsByType("post").map((r) => ({ date: r.date, v: r.amount })), ["date"], "v", range.startDate, range.endDate),
      rows: () => leadsByType("post"),
    },
  ];

  return (
    <div className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[0.95rem] font-bold text-gray-800">Collection Amount As Of Date Range</h3>
          <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">
            Total · Fresh · Reloan · Prepayment · On Time · Overdue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_RANGES.map((q) => (
            <button key={q.label} onClick={() => onRangeChange(quickRange(q))} className="btn-secondary text-[0.75rem]">
              {q.label}
            </button>
          ))}
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={range.startDate}
            max={range.endDate}
            onChange={(e) => onRangeChange({ ...range, startDate: e.target.value })}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={range.endDate}
            min={range.startDate}
            onChange={(e) => onRangeChange({ ...range, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
        <Tile
          icon="rupee"
          label="Total Collection"
          color="#3b6ea5"
          amount={total}
          count={totalCustomers}
          trend={pctChange(total, prevTotal)}
          spark={totalSpark}
          isHero
          onClick={() => setTotalModalOpen(true)}
        />
        {tiles.map((t) => (
          <Tile
            key={t.key}
            icon={t.icon}
            label={t.label}
            color={t.color}
            amount={t.amount}
            count={t.count}
            isMock={t.isMock}
            trend={t.trend}
            spark={t.spark}
            invertTrend={t.invertTrend}
            onClick={() =>
              setDrilldown({
                title: `${t.label} — Drilldown`,
                color: t.color,
                totalLabel: coInr(t.amount),
                isMock: t.isMock,
                rows: t.rows(),
              })
            }
          />
        ))}
      </div>

      {drilldown && (
        <CollectionDrilldownModal
          open
          onClose={() => setDrilldown(null)}
          title={drilldown.title}
          color={drilldown.color}
          totalLabel={drilldown.totalLabel}
          isMock={drilldown.isMock}
          rows={drilldown.rows}
        />
      )}

      <TotalCollectionModal
        open={totalModalOpen}
        onClose={() => setTotalModalOpen(false)}
        total={total}
        totalCustomers={totalCustomers}
        trend={pctChange(total, prevTotal)}
        dailyAverage={dailyAverage}
        highestDay={highestDay}
        lowestDay={lowestDay}
        currentSeries={totalSparkDated}
        previousSeries={prevSparkDated}
        fresh={fresh}
        reloan={reloan}
      />
    </div>
  );
}
