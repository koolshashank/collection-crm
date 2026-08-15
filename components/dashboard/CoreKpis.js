"use client";

import { WidgetError, WidgetLoading } from "./shared";

function TrendPill({ up, children }) {
  return (
    <div
      className={`absolute right-3 top-3 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold ${
        up ? "bg-green-400/15 text-green-600" : "bg-red-400/15 text-red-600"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2 w-2">
        {up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="18 9 12 15 6 9" />}
      </svg>
      {children}
    </div>
  );
}

function KpiIcon({ color, bg, path }) {
  return (
    <div className="mb-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-lg" style={{ background: bg, color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" dangerouslySetInnerHTML={{ __html: path }} />
    </div>
  );
}

/**
 * Core KPI cards — mirror of dashboard.php "Portfolio Overview":
 * Total Accounts / This Month Collection / Collection Rate / Peak.
 */
export default function CoreKpis({ loading, error, onRetry, totalDisp, collDisp, collSub, rateDisp, rateBar, mom, peakDisp, peakLabel }) {
  if (loading) {
    return (
      <div className="card mb-4">
        <WidgetLoading label="Loading portfolio overview…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card mb-4">
        <WidgetError message={error} onRetry={onRetry} />
      </div>
    );
  }

  const cards = [
    {
      val: totalDisp,
      lbl: "Total Accounts",
      color: "#0f9b8e",
      bg: "rgba(15,155,142,.12)",
      trend: { up: true, text: "+12%" },
      icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    },
    {
      val: collDisp,
      lbl: "This Month Collection",
      color: "#1E7E5E",
      bg: "rgba(30,126,94,.10)",
      trend: { up: mom >= 0, text: `${mom >= 0 ? "+" : ""}${Math.abs(mom)}%` },
      icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    },
    {
      val: rateDisp,
      lbl: "Collection Rate",
      color: "#3b6ea5",
      bg: "rgba(59,110,165,.10)",
      trend: null,
      icon: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      bar: rateBar,
      sub: collSub,
    },
    {
      val: peakDisp,
      lbl: `Peak — ${peakLabel || "—"}`,
      color: "#9b59b6",
      bg: "rgba(155,89,182,.10)",
      trend: null,
      icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      sm: true,
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((k, i) => (
        <div
          key={i}
          className="card relative overflow-hidden px-4 pb-3 pt-4 transition hover:-translate-y-0.5 hover:shadow-pop"
        >
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: k.color }} />
          {k.trend && <TrendPill up={k.trend.up}>{k.trend.text}</TrendPill>}
          <KpiIcon color={k.color} bg={k.bg} path={k.icon} />
          <div className={`font-display font-bold leading-none text-gray-800 ${k.sm ? "text-xl" : "text-2xl"}`}>{k.val}</div>
          <div className="mt-1 text-[0.7rem] font-medium leading-tight text-gray-400">{k.lbl}</div>
          {k.sub && (
            <div className="mt-1 text-[0.74rem]">
              <span className="font-bold text-accent">Fresh {k.sub.fresh}%</span>
              <span className="mx-1.5 text-gray-400">·</span>
              <span className="font-bold" style={{ color: "#9b59b6" }}>
                Reloan {k.sub.reloan}%
              </span>
            </div>
          )}
          {k.bar !== null && k.bar !== undefined && (
            <div className="mt-2 h-[3px] overflow-hidden rounded bg-line">
              <div className="h-full rounded transition-all duration-700" style={{ width: `${k.bar}%`, background: k.color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
