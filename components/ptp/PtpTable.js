"use client";

import Link from "next/link";
import { deriveStatus, statusMeta, typeMeta, fmtInr, fmtDate } from "./ptpUtils";

/**
 * PTP records table + pagination — mirror of ptp_details.php.
 * Columns and pagination window (currentPage-3 … +6) identical.
 */
export default function PtpTable({ rows, currentPage, totalPages, limit, onGoToPage }) {
  const startP = Math.max(1, currentPage - 3);
  const endP = Math.min(totalPages, startP + 6);
  const pages = [];
  for (let p = startP; p <= endP; p++) pages.push(p);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className="th">#</th>
              <th className="th">Status</th>
              <th className="th">PTP Date</th>
              <th className="th">Borrower</th>
              <th className="th">Loan ID</th>
              <th className="th">PTP Amount</th>
              <th className="th">Type</th>
              <th className="th">Remarks</th>
              <th className="th">Agent</th>
              <th className="th">Entry Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const serial = (currentPage - 1) * limit + i + 1;
              const name = row.full_name ?? row.name ?? "";
              const initials = String(name || "U").charAt(0).toUpperCase();
              const status = deriveStatus(row.ptp_date ?? null, row.ptp_outcome ?? null);
              const meta = statusMeta(status);
              const type = String(row.ptp_type ?? "full").toLowerCase();
              const tMeta = typeMeta(type);
              return (
                <tr key={row.ptp_id ?? row.id ?? i} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                  <td className="td text-xs text-gray-400">{serial}</td>
                  <td className="td">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:content-['']"
                      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="td font-semibold text-gray-800">{row.ptp_date ? fmtDate(row.ptp_date) : "--"}</td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-light to-accent font-display text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold leading-tight text-gray-800">{name || "—"}</div>
                        <div className="truncate text-[11px] text-gray-400">{row.mobile ?? ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    {row.lead_id || row.loan_id ? (
                      <Link
                        href={`/client-info?lead_id=${encodeURIComponent(row.lead_id ?? "")}&loan_id=${encodeURIComponent(
                          row.loan_id ?? ""
                        )}`}
                        className="inline-block rounded-md bg-accent-light px-2 py-0.5 text-xs font-bold text-accent-dark no-underline transition hover:bg-accent hover:text-white"
                      >
                        {row.loan_id ?? ""}
                      </Link>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="td font-bold" style={{ color: "#9a7230" }}>
                    {fmtInr(row.ptp_amount ?? 0)}
                  </td>
                  <td className="td">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase"
                      style={{ background: tMeta.bg, color: tMeta.color }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </td>
                  <td className="td max-w-[240px] whitespace-normal text-xs text-gray-600">{row.remarks ?? ""}</td>
                  <td className="td text-xs text-gray-600">{row.agent_name ?? row.added_by ?? ""}</td>
                  <td className="td text-xs text-gray-400">{row.created_at ? fmtDate(row.created_at) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-surface px-5 py-3.5">
          <div className="text-xs text-gray-500">
            Page <strong className="text-gray-800">{currentPage}</strong> of{" "}
            <strong className="text-gray-800">{totalPages}</strong>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onGoToPage(currentPage - 1)}
              className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
            >
              ‹
            </button>
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onGoToPage(p)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] px-2 text-sm transition ${
                  p === currentPage
                    ? "border-accent bg-accent font-bold text-white"
                    : "border-line bg-white text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onGoToPage(currentPage + 1)}
              className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
