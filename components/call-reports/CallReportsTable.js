"use client";

import Link from "next/link";

function fmtDateTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(sec) {
  const s = parseInt(sec, 10) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function statusMeta(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "completed") return { color: "#0f9b6e", bg: "#e8f9f1", border: "#bdeed7" };
  if (s === "missed" || s === "failed") return { color: "#c0392b", bg: "#fdf2f2", border: "#f3c6c6" };
  return { color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
}

export default function CallReportsTable({ rows, currentPage, totalPages, limit, onGoToPage }) {
  const startP = Math.max(1, currentPage - 3);
  const endP = Math.min(totalPages, startP + 6);
  const pages = [];
  for (let p = startP; p <= endP; p++) pages.push(p);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className="th">#</th>
              <th className="th">Call Date</th>
              <th className="th">Agent</th>
              <th className="th">Lead / Loan</th>
              <th className="th">Mobile</th>
              <th className="th">Process</th>
              <th className="th">Disposition</th>
              <th className="th">Call Status</th>
              <th className="th">Duration</th>
              <th className="th">Recording</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const serial = (currentPage - 1) * limit + i + 1;
              const meta = statusMeta(row.CALL_STATUS);
              return (
                <tr
                  key={row.CALL_REFERENCE_ID ?? i}
                  className="border-b border-line last:border-0 hover:bg-accent-light/20"
                >
                  <td className="td text-xs text-gray-400">{serial}</td>
                  <td className="td text-xs text-gray-600">{fmtDateTime(row.CALL_DATE)}</td>
                  <td className="td font-semibold text-gray-800">{row.USER_ID ?? "--"}</td>
                  <td className="td">
                    {row.LEAD_ID ? (
                      <Link
                        href={`/client-info?lead_id=${encodeURIComponent(row.LEAD_ID)}`}
                        className="inline-block rounded-md bg-accent-light px-2 py-0.5 text-xs font-bold text-accent-dark no-underline transition hover:bg-accent hover:text-white"
                      >
                        {row.LEAD_ID}
                      </Link>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="td text-xs text-gray-600">{row.MOBILE_NO ?? "--"}</td>
                  <td className="td text-xs text-gray-600">{row.PROCESS_NAME ?? "--"}</td>
                  <td className="td">
                    <span className="rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent-dark">
                      {row.DISPOSITION ?? "--"}
                    </span>
                  </td>
                  <td className="td">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:content-['']"
                      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
                    >
                      {row.CALL_STATUS ?? "Unknown"}
                    </span>
                  </td>
                  <td className="td text-xs text-gray-600">{fmtDuration(row.CALL_DURATION)}</td>
                  <td className="td">
                    {row.RECORDING_FILE_NAME ? (
                      <a
                        href={row.RECORDING_FILE_NAME}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-accent-dark underline"
                      >
                        ▶ Play
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">--</span>
                    )}
                  </td>
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
