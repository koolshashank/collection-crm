"use client";

import { CiIcon } from "@/components/client-info/icons";
import { fmtInr, numberFormat } from "@/components/dashboard/format";

const CARD_DEFS = [
  { key: "totalCollected", label: "Total Collected", icon: "rupee", tone: { bg: "#e6f6f4", text: "#0c7a70" }, isAmount: true },
  { key: "totalRecovered", label: "Total Recovered", icon: "refresh", tone: { bg: "#f3e8fd", text: "#6d28d9" }, isAmount: true },
  { key: "outstanding", label: "Outstanding", icon: "card", tone: { bg: "#fdf1e3", text: "#c2650f" }, isAmount: true },
  { key: "casesClosed", label: "Cases Closed", icon: "users", tone: { bg: "#eaf2fb", text: "#2563a8" }, isAmount: false },
  { key: "overdueCases", label: "Overdue Cases", icon: "clock", tone: { bg: "#fdf1f0", text: "#c0392b" }, isAmount: false },
];

export default function StatCards({ stats, compareLabel }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {CARD_DEFS.map((d) => {
        const s = stats[d.key];
        if (!s) return null;
        const badWhenUp = Boolean(s.badWhenUp);
        const trendGood = badWhenUp ? s.trend < 0 : s.trend > 0;
        return (
          <div key={d.key} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: d.tone.bg, color: d.tone.text }}>
                <CiIcon name={d.icon} size={15} strokeWidth={2} />
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">{d.label}</span>
            </div>
            <div className="mt-2 font-display text-xl font-bold text-gray-800">
              {d.isAmount ? fmtInr(s.value) : numberFormat(s.value)}
            </div>
            {s.trend !== 0 && (
              <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${trendGood ? "text-emerald-700" : "text-danger"}`}>
                {s.trend > 0 ? "▲" : "▼"} {Math.abs(s.trend)}% {compareLabel ? `vs ${compareLabel}` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
