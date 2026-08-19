"use client";

import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler } from "chart.js";
import { fmtInr, numberFormat } from "@/components/dashboard/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler);

/** Recovery Summary — trend line + status-breakdown donut + a matching table. */
export default function RecoverySummaryReport({ data }) {
  const { trend, breakdown, totalRecovered } = data;

  const lineData = {
    labels: trend.map((t) => t.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })),
    datasets: [
      {
        data: trend.map((t) => t.amount),
        borderColor: "#0f9b8e",
        backgroundColor: "#0f9b8e1a",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#16223c", padding: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { callback: (v) => fmtInr(v), font: { size: 10 } }, grid: { color: "rgba(226,229,234,.5)" } },
    },
  };

  const doughnutData = {
    labels: breakdown.map((b) => b.status),
    datasets: [{ data: breakdown.map((b) => b.pct), backgroundColor: breakdown.map((b) => b.color), borderColor: "#fff", borderWidth: 2 }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#16223c", padding: 8, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } } },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-4">
          <h4 className="mb-3 font-display text-sm font-bold text-gray-800">Recovery Over Time</h4>
          <div className="h-[220px]">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="card p-4">
          <h4 className="mb-3 font-display text-sm font-bold text-gray-800">Recovery Breakdown</h4>
          <div className="flex items-center gap-4">
            <div className="relative h-[130px] w-[130px] shrink-0">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-400">Total</span>
                <span className="text-sm font-bold text-gray-800">{fmtInr(totalRecovered)}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {breakdown.map((b) => (
                <div key={b.status} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                    <span className="truncate">{b.status}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-gray-800">
                    {b.pct}% · {fmtInr(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">Recovery Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5">Recovery Status</th>
                <th className="px-4 py-2.5">Cases</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">% of Total</th>
                <th className="px-4 py-2.5">Avg. Recovery per Case</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.status} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">{numberFormat(b.cases)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-accent-dark">{fmtInr(b.amount)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{b.pct}%</td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">{fmtInr(b.avgPerCase)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface text-sm font-bold text-gray-800">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 tabular-nums">{numberFormat(data.totalCases)}</td>
                <td className="px-4 py-2.5 tabular-nums text-accent-dark">{fmtInr(data.totalAmount)}</td>
                <td className="px-4 py-2.5">100%</td>
                <td className="px-4 py-2.5 tabular-nums">{fmtInr(Math.round(data.totalAmount / data.totalCases))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-line bg-surface px-5 py-3 text-xs text-gray-500">
          Showing 1 to {breakdown.length} of {breakdown.length} rows
        </div>
      </div>
    </div>
  );
}
