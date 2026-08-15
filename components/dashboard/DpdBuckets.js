"use client";

import { isNumeric, numberFormat } from "./format";
import { SectionLabel, WidgetError, WidgetLoading } from "./shared";

const WARN_ICON =
  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
const TRIANGLE_ICON =
  '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';

/* Same labels / colors / trend flags as dashboard.php's $dpdBuckets */
const BUCKET_DEFS = [
  { label: "No DPD", color: "#1E7E5E", bg: "rgba(30,126,94,.10)", icon: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', trend: null },
  { label: "1–30 DPD", color: "#e8a33d", bg: "rgba(232,163,61,.10)", icon: WARN_ICON, trend: "down" },
  { label: "31–60 DPD", color: "#d97706", bg: "rgba(217,119,6,.10)", icon: WARN_ICON, trend: "down" },
  { label: "61–90 DPD", color: "#ea580c", bg: "rgba(234,88,12,.10)", icon: TRIANGLE_ICON, trend: "down" },
  { label: "91–120 DPD", color: "#dc2626", bg: "rgba(220,38,38,.10)", icon: TRIANGLE_ICON, trend: "down" },
  { label: "121–180 DPD", color: "#b91c1c", bg: "rgba(185,28,28,.10)", icon: TRIANGLE_ICON, trend: "down" },
  { label: "180+ DPD", color: "#7f1d1d", bg: "rgba(127,29,29,.10)", icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', trend: "down" },
];

/**
 * DPD Bucket Distribution — mirror of dashboard.php's g7 KPI grid,
 * incl. the "Live from portfolio-summary" vs fallback badge.
 */
export default function DpdBuckets({ values, live, loading, error, onRetry }) {
  return (
    <>
      <SectionLabel
        right={
          live ? (
            <span className="rounded-full bg-accent-light px-2.5 py-1 text-[0.68rem] font-semibold text-accent-dark">
              ● Live from portfolio-summary
            </span>
          ) : (
            <span
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.68rem] font-semibold text-gray-400"
              title="portfolio-summary API returned nothing — showing dashboard-cards fallback, or '—' if that's empty too"
            >
              Fallback source
            </span>
          )
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        DPD Bucket Distribution
      </SectionLabel>

      {loading ? (
        <div className="card mb-4">
          <WidgetLoading label="Loading DPD buckets…" />
        </div>
      ) : error ? (
        <div className="card mb-4">
          <WidgetError message={error} onRetry={onRetry} />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
          {BUCKET_DEFS.map((d, i) => {
            const v = values[i];
            const dispVal = isNumeric(v) ? numberFormat(v) : v || "—";
            return (
              <div key={d.label} className="card relative overflow-hidden px-4 pb-3 pt-4 transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: d.color }} />
                {d.trend === "down" ? (
                  <div className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full bg-red-400/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-red-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2 w-2">
                      <polyline points="18 9 12 15 6 9" />
                    </svg>
                    High
                  </div>
                ) : i === 0 ? (
                  <div className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full bg-green-400/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-green-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2 w-2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    Good
                  </div>
                ) : null}
                <div className="mb-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-lg" style={{ background: d.bg, color: d.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" dangerouslySetInnerHTML={{ __html: d.icon }} />
                </div>
                <div className="font-display text-base font-bold leading-none text-gray-800">{dispVal}</div>
                <div className="mt-1 text-[0.7rem] font-medium leading-tight text-gray-400">{d.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
