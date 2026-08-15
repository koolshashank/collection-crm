"use client";

import { fmtInr, numberFormat } from "@/components/dashboard/format";
import { DPD_BUCKETS, UNKNOWN_BUCKET, bucketColor, bucketLabel } from "@/lib/dpdBuckets";

const COLUMNS = [...DPD_BUCKETS, UNKNOWN_BUCKET];

function pct(count, total) {
  if (!total) return "—";
  return `${((count / total) * 100).toFixed(1)}%`;
}

export default function VintageSummaryTable({ cohorts }) {
  if (!cohorts.length) {
    return <div className="p-6 text-center text-sm text-gray-500">No portfolio data returned.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="th">Cohort</th>
            <th className="th text-right">Loans</th>
            <th className="th text-right">Sanctioned Amt</th>
            {COLUMNS.map((b) => (
              <th key={b.key} className="th text-right">
                <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: bucketColor(b.key) }} />
                {bucketLabel(b.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((row, i) => (
            <tr key={row.month} className={`border-b border-line last:border-0 ${i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white"}`}>
              <td className="td font-semibold text-gray-800">{row.label}</td>
              <td className="td text-right tabular-nums">{numberFormat(row.totalCount)}</td>
              <td className="td text-right tabular-nums">{fmtInr(row.totalAmount)}</td>
              {COLUMNS.map((b) => {
                const cell = row.buckets[b.key];
                return (
                  <td key={b.key} className="td text-right tabular-nums">
                    {cell.count > 0 ? (
                      <>
                        {numberFormat(cell.count)}{" "}
                        <span className="text-xs text-gray-400">({pct(cell.count, row.totalCount)})</span>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
