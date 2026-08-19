"use client";

import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { fmtInr, numberFormat } from "@/components/dashboard/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/* Severity is a status encoding (good/warning/critical), not a rainbow of
   arbitrary hues — thresholds chosen so the worst offenders read as red. */
function parTone(pct) {
  if (pct >= 20) return { color: "#d64545", badge: "border-danger/40 bg-red-50 text-danger" };
  if (pct >= 10) return { color: "#e8a33d", badge: "border-amber/40 bg-amber/10 text-amber" };
  return { color: "#0f9b8e", badge: "border-accent/40 bg-accent-light text-accent-dark" };
}

/** Credit Person-wise PAR Analysis — which sanctioning officer's loan book
 * goes overdue the most, so risky sanctioning patterns can be flagged. */
export default function CreditPersonParReport({ data }) {
  const { rows, total } = data;
  const maxPct = Math.max(...rows.map((r) => r.parPct));

  const barData = {
    labels: rows.map((r) => r.name),
    datasets: [
      {
        data: rows.map((r) => r.parPct),
        backgroundColor: rows.map((r) => parTone(r.parPct).color),
        borderRadius: 4,
        barThickness: 16,
      },
    ],
  };
  const barOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#16223c",
        padding: 8,
        callbacks: { label: (ctx) => `${ctx.raw}% of cases in PAR` },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: Math.ceil((maxPct + 5) / 5) * 5,
        ticks: { callback: (v) => v + "%", font: { size: 10 } },
        grid: { color: "rgba(226,229,234,.5)" },
      },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h4 className="mb-1 font-display text-sm font-bold text-gray-800">% of Cases in PAR by Credit Person</h4>
        <p className="mb-4 text-xs text-gray-500">
          Share of each sanctioning officer&apos;s loan book that is currently overdue (Portfolio At Risk) — higher %
          means that person&apos;s sanctioned cases go bad more often.
        </p>
        <div style={{ height: Math.max(220, rows.length * 34) }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">Credit Person-wise PAR Analysis</h3>
          <span className="badge bg-accent-light text-accent-dark">Portfolio PAR: {total.parPct}%</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5">Credit Person</th>
                <th className="px-4 py-2.5">Cases Sanctioned</th>
                <th className="px-4 py-2.5">Cases in PAR</th>
                <th className="px-4 py-2.5">PAR %</th>
                <th className="px-4 py-2.5">Sanction Amount</th>
                <th className="px-4 py-2.5">Outstanding in PAR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone = parTone(r.parPct);
                return (
                  <tr key={r.name} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700">{numberFormat(r.totalCases)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700">{numberFormat(r.parCases)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`badge border ${tone.badge}`}>{r.parPct}%</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-gray-800">{fmtInr(r.sanctionAmt)}</td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-danger">{fmtInr(r.parOutstanding)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface text-sm font-bold text-gray-800">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 tabular-nums">{numberFormat(total.totalCases)}</td>
                <td className="px-4 py-2.5 tabular-nums">{numberFormat(total.parCases)}</td>
                <td className="px-4 py-2.5">{total.parPct}%</td>
                <td className="px-4 py-2.5 tabular-nums">{fmtInr(total.sanctionAmt)}</td>
                <td className="px-4 py-2.5 tabular-nums text-danger">{fmtInr(total.parOutstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-line bg-surface px-5 py-3 text-xs text-gray-500">
          Showing 1 to {rows.length} of {rows.length} credit persons
        </div>
      </div>
    </div>
  );
}
