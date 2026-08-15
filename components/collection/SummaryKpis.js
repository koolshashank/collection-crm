"use client";

import { coInr, numberFormat } from "./format";

/**
 * KPI strip + customer breakdown row — mirror of collection.php's
 * .co-kpi-strip and .co-breakdown blocks (same labels, same math).
 */
export default function SummaryKpis({ summary }) {
  const kPre = Number(summary?.pre_collection ?? 0);
  const kOn = Number(summary?.ontime_collection ?? 0);
  const kPost = Number(summary?.post_collection ?? 0);
  const kTotal = Number(summary?.total_collection ?? 0);
  const cPre = parseInt(summary?.pre_customers ?? 0, 10) || 0;
  const cOn = parseInt(summary?.ontime_customers ?? 0, 10) || 0;
  const cPost = parseInt(summary?.post_customers ?? 0, 10) || 0;
  const cTotal = parseInt(summary?.total_customers ?? 0, 10) || 0;

  const kpis = [
    {
      label: "Pre Collection",
      value: coInr(kPre),
      sub: `${numberFormat(cPre)} customers`,
      border: "#0f9b8e",
      valColor: undefined,
      bar: { width: kTotal > 0 ? Math.round((kPre / kTotal) * 100) : 0, bg: "linear-gradient(90deg,#e6f6f4,#0f9b8e)" },
    },
    {
      label: "On-time Collection",
      value: coInr(kOn),
      sub: `${numberFormat(cOn)} customers`,
      border: "#1E7E5E",
      valColor: "#1E7E5E",
      bar: { width: kTotal > 0 ? Math.round((kOn / kTotal) * 100) : 0, bg: "linear-gradient(90deg,#a8ddd0,#1E7E5E)" },
    },
    {
      label: "Post Collection",
      value: coInr(kPost),
      sub: `${numberFormat(cPost)} customers`,
      border: "#e8a33d",
      valColor: "#e8a33d",
      bar: { width: kTotal > 0 ? Math.round((kPost / kTotal) * 100) : 0, bg: "linear-gradient(90deg,#fdf3e3,#e8a33d)" },
    },
    {
      label: "Total Collected",
      value: coInr(kTotal),
      sub: `${numberFormat(cTotal)} total customers`,
      border: "#3b6ea5",
      valColor: "#3b6ea5",
      bar: { width: 100, bg: "linear-gradient(90deg,#a8d4ef,#3b6ea5)" },
    },
  ];

  const breakdown = [
    { num: numberFormat(cPre), label: "Pre Customers", color: "#0c7a70" },
    { num: numberFormat(cOn), label: "On-time Customers", color: "#1E7E5E" },
    { num: numberFormat(cPost), label: "Post Customers", color: "#e8a33d" },
    { num: numberFormat(cTotal), label: "Total Customers", color: "#3b6ea5" },
  ];

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="card relative overflow-hidden px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-pop sm:px-5"
            style={{ borderLeft: `3px solid ${k.border}` }}
          >
            <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-accent-light opacity-45" />
            <span className="text-[0.67rem] font-bold uppercase tracking-wider text-gray-400">{k.label}</span>
            <span className="relative z-[1] my-1 block font-display text-2xl font-bold leading-none text-gray-800" style={k.valColor ? { color: k.valColor } : undefined}>
              {k.value}
            </span>
            <span className="relative z-[1] text-[0.71rem] text-gray-400">{k.sub}</span>
            <div className="mt-2 h-[3px] rounded-xl" style={{ width: `${k.bar.width}%`, background: k.bar.bg }} />
          </div>
        ))}
      </div>

      {/* Customer breakdown row */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {breakdown.map((b) => (
          <div key={b.label} className="rounded-xl border border-line bg-surface px-3.5 py-3 text-center">
            <div className="font-display text-lg font-bold leading-none" style={{ color: b.color }}>
              {b.num}
            </div>
            <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-gray-400">{b.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
