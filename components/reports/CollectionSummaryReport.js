"use client";

import { fmtInr, numberFormat } from "@/components/dashboard/format";

function pctBadge(pct) {
  const tone = pct >= 50 ? "bg-emerald-50 text-emerald-700" : pct >= 40 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-danger";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{pct}%</span>;
}

/** Collection Summary — plain team-wise table, the simplest of the three report views. */
export default function CollectionSummaryReport({ data }) {
  const state = { rows: data.rows, total: data.total };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
        <h3 className="font-display text-base font-semibold text-gray-800">Collection Summary</h3>
      </div>

      <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5">Total Cases</th>
                  <th className="px-4 py-2.5">Total Outstanding</th>
                  <th className="px-4 py-2.5">Collected</th>
                  <th className="px-4 py-2.5">Recovered</th>
                  <th className="px-4 py-2.5">Overdue Cases</th>
                  <th className="px-4 py-2.5">Collection %</th>
                  <th className="px-4 py-2.5">Recovery %</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.team} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{r.team}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700">{numberFormat(r.totalCases)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700">{fmtInr(r.totalOutstanding)}</td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-accent-dark">{fmtInr(r.collected)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700">{fmtInr(r.recovered)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-danger">{numberFormat(r.overdueCases)}</td>
                    <td className="px-4 py-2.5">{pctBadge(r.collectionPct)}</td>
                    <td className="px-4 py-2.5">{pctBadge(r.recoveryPct)}</td>
                  </tr>
                ))}
              </tbody>
              {state.total && (
                <tfoot>
                  <tr className="bg-surface text-sm font-bold text-gray-800">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 tabular-nums">{numberFormat(state.total.totalCases)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtInr(state.total.totalOutstanding)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-accent-dark">{fmtInr(state.total.collected)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtInr(state.total.recovered)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-danger">{numberFormat(state.total.overdueCases)}</td>
                    <td className="px-4 py-2.5">{pctBadge(state.total.collectionPct)}</td>
                    <td className="px-4 py-2.5">{pctBadge(state.total.recoveryPct)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-surface px-5 py-3">
            <span className="text-xs text-gray-500">
              Showing 1 to {state.rows.length} of {state.rows.length} teams
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-gray-400 opacity-40">
                ‹
              </button>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">1</span>
              <button type="button" disabled className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-gray-400 opacity-40">
                ›
              </button>
            </div>
          </div>
        </>
    </div>
  );
}
