"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { fmtInr, numberFormat } from "@/components/dashboard/format";

ChartJS.register(ArcElement, Tooltip);

/** DPD Analysis — one big bucket-distribution donut + the matching table. */
export default function DpdAnalysisReport({ data }) {
  const { buckets, total } = data;
  const doughnutData = {
    labels: buckets.map((b) => b.label),
    datasets: [{ data: buckets.map((b) => b.cases), backgroundColor: buckets.map((b) => b.color), borderColor: "#fff", borderWidth: 2 }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#16223c",
        padding: 8,
        callbacks: { label: (ctx) => `${ctx.label}: ${numberFormat(ctx.raw)} cases` },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h4 className="mb-4 font-display text-sm font-bold text-gray-800">DPD Bucket Distribution</h4>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-[220px] w-[220px] shrink-0">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-800">{numberFormat(total.cases)}</span>
              <span className="text-[11px] text-gray-400">Total Cases</span>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
            {buckets.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                  <span className="truncate">{b.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-gray-800">
                  {numberFormat(b.cases)} ({b.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">DPD Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5">DPD Bucket</th>
                <th className="px-4 py-2.5">Cases</th>
                <th className="px-4 py-2.5">Outstanding Amount</th>
                <th className="px-4 py-2.5">% of Total Cases</th>
                <th className="px-4 py-2.5">Avg. Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.label} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                      {b.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">{numberFormat(b.cases)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-accent-dark">{fmtInr(b.outstanding)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{b.pct}%</td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">{fmtInr(b.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface text-sm font-bold text-gray-800">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 tabular-nums">{numberFormat(total.cases)}</td>
                <td className="px-4 py-2.5 tabular-nums text-accent-dark">{fmtInr(total.outstanding)}</td>
                <td className="px-4 py-2.5">100%</td>
                <td className="px-4 py-2.5 tabular-nums">{fmtInr(Math.round(total.outstanding / total.cases))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-line bg-surface px-5 py-3 text-xs text-gray-500">
          Showing 1 to {buckets.length} of {buckets.length} buckets
        </div>
      </div>
    </div>
  );
}
