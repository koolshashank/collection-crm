"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import Spinner from "@/components/ui/Spinner";
import { WidgetError } from "./shared";
import { coInr, coType, daysAgoISO, firstOfMonthISO, numberFormat, todayISO } from "@/components/collection/format";
import CollectionDrilldownModal from "./CollectionDrilldownModal";

const QUICK_RANGES = [
  { label: "Today", start: () => todayISO(), end: () => todayISO() },
  { label: "Last 7 Days", start: () => daysAgoISO(6), end: () => todayISO() },
  { label: "This Month", start: () => firstOfMonthISO(), end: () => todayISO() },
  { label: "Last 30 Days", start: () => daysAgoISO(29), end: () => todayISO() },
];

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

function Tile({ label, color, amount, count, isMock, isHero, onClick }) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      className={`card relative overflow-hidden border-t-[3px] px-4 py-4 transition ${
        clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-pop" : ""
      } ${isHero ? "bg-accent-light/30" : ""}`}
      style={{ borderTopColor: color }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
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
      <div className="mt-1 text-[0.72rem] text-gray-400">{numberFormat(count)} count</div>
    </div>
  );
}

export default function CollectionBreakdown() {
  const [range, setRange] = useState({ startDate: firstOfMonthISO(), endDate: todayISO() });
  const [state, setState] = useState({ loading: true, error: null, summary: null, leads: [] });
  const [drilldown, setDrilldown] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = new URLSearchParams({
      startDate: range.startDate,
      endDate: range.endDate,
      perPage: "100",
    });
    const res = await clientFetch(`/api/collection/report?${params.toString()}`);
    if (!res.ok || !res.data?.success) {
      setState({ loading: false, error: res.data?.message || res.error || "Could not load collection data.", summary: null, leads: [] });
      return;
    }
    setState({
      loading: false,
      error: null,
      summary: res.data.summary ?? {},
      leads: Array.isArray(res.data.leads) ? res.data.leads : [],
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
  const total = Number(s.total_collection ?? 0);
  const totalCustomers = parseInt(s.total_customers ?? 0, 10) || 0;
  const pre = { amount: Number(s.pre_collection ?? 0), count: parseInt(s.pre_customers ?? 0, 10) || 0 };
  const ontime = { amount: Number(s.ontime_collection ?? 0), count: parseInt(s.ontime_customers ?? 0, 10) || 0 };
  const post = { amount: Number(s.post_collection ?? 0), count: parseInt(s.post_customers ?? 0, 10) || 0 };
  const { fresh, reloan } = estimateFreshReloan(total, totalCustomers);

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

  const tiles = [
    { key: "fresh", label: "Fresh", color: "#9b59b6", ...fresh, isMock: true, rows: () => mockRows(fresh.count, fresh.amount) },
    { key: "reloan", label: "Reloan", color: "#c2185b", ...reloan, isMock: true, rows: () => mockRows(reloan.count, reloan.amount) },
    { key: "pre", label: "Prepayment", color: "#0f9b8e", ...pre, isMock: false, rows: () => leadsByType("pre") },
    { key: "ontime", label: "On Time", color: "#1E7E5E", ...ontime, isMock: false, rows: () => leadsByType("ontime") },
    { key: "post", label: "Overdue", color: "#e8a33d", ...post, isMock: false, rows: () => leadsByType("post") },
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
            <button
              key={q.label}
              onClick={() => setRange({ startDate: q.start(), endDate: q.end() })}
              className="btn-secondary text-[0.75rem]"
            >
              {q.label}
            </button>
          ))}
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={range.startDate}
            max={range.endDate}
            onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={range.endDate}
            min={range.startDate}
            onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
        <Tile label="Total Collection" color="#3b6ea5" amount={total} count={totalCustomers} isHero />
        {tiles.map((t) => (
          <Tile
            key={t.key}
            label={t.label}
            color={t.color}
            amount={t.amount}
            count={t.count}
            isMock={t.isMock}
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
    </div>
  );
}
