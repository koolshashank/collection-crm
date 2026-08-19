"use client";

import { useState } from "react";
import { CiIcon } from "@/components/client-info/icons";
import { isNumeric, numberFormat } from "./format";
import { SectionLabel, WidgetError, WidgetLoading } from "./shared";
import DpdBucketModal from "./DpdBucketModal";

/* Same buckets as portfolio-summary's dpdBucketDistribution — status tier
   labels/colors are new (matches the redesign), boundaries are unchanged.
   min/max feed both the modal's real case lookup and the Portfolio deep link. */
const BUCKET_DEFS = [
  { label: "No DPD", tier: "Good", color: "#1E7E5E", icon: "check", min: 0, max: 0 },
  { label: "1–30 DPD", tier: "Watch", color: "#e8a33d", icon: "warn", min: 1, max: 30 },
  { label: "31–60 DPD", tier: "At Risk", color: "#d97706", icon: "warn", min: 31, max: 60 },
  { label: "61–90 DPD", tier: "High", color: "#ea580c", icon: "warn", min: 61, max: 90 },
  { label: "91–120 DPD", tier: "High", color: "#dc2626", icon: "warn", min: 91, max: 120 },
  { label: "121–180 DPD", tier: "Critical", color: "#b91c1c", icon: "warn", min: 121, max: 180 },
  { label: "180+ DPD", tier: "Critical", color: "#7f1d1d", icon: "warn", min: 181, max: null },
];

const TIER_TONE = {
  Good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Watch: "border-amber-200 bg-amber-50 text-amber-700",
  "At Risk": "border-orange-200 bg-orange-50 text-orange-700",
  High: "border-red-200 bg-red-50 text-danger",
  Critical: "border-red-300 bg-red-100 text-red-800",
};

/**
 * DPD Bucket Distribution — mirror of dashboard.php's g7 KPI grid,
 * incl. the "Live from portfolio-summary" vs fallback badge. Redesigned as
 * a compact single-row strip (icon · label · tier pill, value, % of total).
 */
export default function DpdBuckets({ values, live, loading, error, onRetry }) {
  const numericValues = values.filter(isNumeric).map(Number);
  const total = numericValues.reduce((s, v) => s + v, 0);
  const [selected, setSelected] = useState(null);

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
        <CiIcon name="warn" size={12} strokeWidth={2} />
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
        <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 2xl:grid-cols-7">
          {BUCKET_DEFS.map((d, i) => {
            const v = values[i];
            const num = isNumeric(v) ? Number(v) : null;
            const dispVal = num !== null ? numberFormat(num) : v || "—";
            const pctOfTotal = num !== null && total > 0 ? Math.round((num / total) * 1000) / 10 : null;
            return (
              <button
                key={d.label}
                type="button"
                onClick={() =>
                  num !== null &&
                  setSelected({
                    label: d.label,
                    tier: d.tier,
                    tierClass: TIER_TONE[d.tier],
                    color: d.color,
                    min: d.min,
                    max: d.max,
                    count: num,
                    pctOfTotal,
                  })
                }
                disabled={num === null}
                className="card relative overflow-hidden px-3.5 py-3 text-left transition enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:shadow-pop disabled:cursor-default"
              >
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: d.color }} />
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: d.color + "1a", color: d.color }}
                    >
                      <CiIcon name={d.icon} size={12} strokeWidth={2.5} />
                    </span>
                    <span className="truncate text-[0.7rem] font-semibold text-gray-600">{d.label}</span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] font-bold ${TIER_TONE[d.tier]}`}>
                    {d.tier}
                  </span>
                </div>
                <div className="mt-2 font-display text-lg font-bold leading-none text-gray-800">{dispVal}</div>
                <div className="mt-1 text-[0.66rem] text-gray-400">
                  {pctOfTotal !== null ? `${pctOfTotal}% of total` : "—"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DpdBucketModal open={!!selected} onClose={() => setSelected(null)} bucket={selected} />
    </>
  );
}
