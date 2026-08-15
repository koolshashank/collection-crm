"use client";

import Link from "next/link";
import { coDate, coInitials, coInr, coType, numberFormat } from "./format";

/* Same chip classes as collection.php's .co-type-chip variants */
const TYPE_CHIP = {
  ontime: { label: "On-time", cls: "bg-[#e8f5f0] text-[#1E7E5E]" },
  pre: { label: "Pre", cls: "bg-line text-accent-dark" },
  post: { label: "Post", cls: "bg-[#fdf3e3] text-amber" },
  none: { label: "--", cls: "bg-surface text-gray-400" },
};

function Amount({ value, color }) {
  const n = Number(value) || 0;
  if (n <= 0) return <span className="text-[0.78rem] text-gray-400" />;
  return (
    <span className="font-bold tabular-nums" style={{ color }}>
      {coInr(n)}
    </span>
  );
}

function PageBtn({ children, onClick, current, disabled, aria }) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-line px-2 text-[0.79rem] text-gray-400 opacity-40">
        {children}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-[0.79rem] transition ${
        current
          ? "border-accent bg-accent font-bold text-white"
          : "border-line bg-panel text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Collection leads table + pagination — mirror of collection.php's
 * .co-tbl (same 11 columns, tfoot page totals, page-range pager).
 */
export default function LeadsTable({ leads, apiError, page, totalItems, totalPages, onPageChange }) {
  const rowStart = (page - 1) * 10 + 1;

  /* tfoot page totals — same math as PHP */
  const ft = leads.reduce(
    (acc, l) => ({
      pre: acc.pre + (Number(l.pre_collection) || 0),
      on: acc.on + (Number(l.ontime_collection) || 0),
      post: acc.post + (Number(l.post_collection) || 0),
      tot: acc.tot + (Number(l.total_collection) || 0),
    }),
    { pre: 0, on: 0, post: 0, tot: 0 }
  );

  const range = 5;
  const pStart = Math.max(1, page - range);
  const pEnd = Math.min(totalPages, page + range);
  const pages = [];
  for (let i = pStart; i <= pEnd; i++) pages.push(i);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.81rem]">
          <thead>
            <tr className="border-b-2 border-line bg-surface">
              {["#", "Borrower", "Loan No", "Repayment Date", "Type"].map((h) => (
                <th key={h} className="th whitespace-nowrap px-3.5 py-2.5 text-left">
                  {h}
                </th>
              ))}
              {["Pre", "On-time", "Post", "Total"].map((h) => (
                <th key={h} className="th whitespace-nowrap px-3.5 py-2.5 text-right">
                  {h}
                </th>
              ))}
              <th className="th whitespace-nowrap px-3.5 py-2.5 text-left">Last Collection</th>
              <th className="th px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="mb-1 h-12 w-12 opacity-25">
                      {apiError ? (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </>
                      ) : (
                        <>
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </>
                      )}
                    </svg>
                    <div className="font-display text-base text-gray-800">
                      {apiError ? "Could not load data" : "No collections found"}
                    </div>
                    <div className="max-w-xs text-[0.8rem] leading-relaxed text-gray-400">
                      {apiError || "No records match the selected date range or search term. Try adjusting the filters."}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((l, idx) => {
                const type = TYPE_CHIP[coType(l)];
                return (
                  <tr key={`${l.lead_id ?? idx}-${idx}`} className="border-b border-line last:border-b-0 hover:bg-accent/5">
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[0.74rem] text-gray-400">{rowStart + idx}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[0.75rem] font-bold text-white"
                          style={{ background: "linear-gradient(135deg,#e6f6f4,#0f9b8e)" }}
                        >
                          {coInitials(l.full_name || "")}
                        </div>
                        <div>
                          <div className="text-[0.82rem] font-semibold leading-tight text-gray-800">{l.full_name || "--"}</div>
                          <div className="text-[0.69rem] text-gray-400">{l.mobile || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <Link
                        href={`/client-info?lead_id=${encodeURIComponent(l.lead_id ?? "")}`}
                        className="inline-block rounded bg-accent-light px-1.5 py-0.5 text-[0.74rem] font-bold text-accent-dark hover:bg-accent hover:text-white"
                      >
                        {l.loan_no || "--"}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[0.78rem] text-gray-400">{coDate(l.repayment_date)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.67rem] font-bold ${type.cls}`}>
                        {type.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <Amount value={l.pre_collection} color="#0c7a70" />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <Amount value={l.ontime_collection} color="#1E7E5E" />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <Amount value={l.post_collection} color="#e8a33d" />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <span className="font-bold tabular-nums" style={{ color: "#3b6ea5" }}>
                        {coInr(Number(l.total_collection) || 0)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[0.78rem] text-gray-400">{coDate(l.last_collection_date_ist)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {l.mobile && (
                          <a
                            href={`tel:${l.mobile}`}
                            title={`Call ${l.mobile}`}
                            className="inline-flex items-center rounded-lg border border-line bg-panel px-2 py-1 text-gray-600 transition hover:border-accent hover:bg-accent-light hover:text-accent-dark"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                              <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 5.18 2 2 0 015.06 3h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L9.09 10.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.9.58 2.9.71A2 2 0 0122 16.92z" />
                            </svg>
                          </a>
                        )}
                        <Link
                          href={`/client-info?lead_id=${encodeURIComponent(l.lead_id ?? "")}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1 text-[0.73rem] text-gray-600 transition hover:border-accent hover:bg-accent-light hover:text-accent-dark"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {leads.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-accent-light text-[0.8rem] font-bold text-accent-dark">
                <td colSpan={5} className="px-3.5 py-2.5 text-right">
                  Page totals —
                </td>
                <td className="px-3.5 py-2.5 text-right">{coInr(ft.pre)}</td>
                <td className="px-3.5 py-2.5 text-right">{coInr(ft.on)}</td>
                <td className="px-3.5 py-2.5 text-right">{coInr(ft.post)}</td>
                <td className="px-3.5 py-2.5 text-right">{coInr(ft.tot)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-surface px-4 py-3 sm:px-5">
          <div className="text-[0.76rem] text-gray-400">
            Showing{" "}
            <strong className="text-gray-800">
              {numberFormat((page - 1) * 10 + 1)}–{numberFormat(Math.min(page * 10, totalItems))}
            </strong>{" "}
            of <strong className="text-gray-800">{numberFormat(totalItems)}</strong> records
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <PageBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria="Previous page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </PageBtn>

            {pStart > 1 && (
              <>
                <PageBtn onClick={() => onPageChange(1)}>1</PageBtn>
                {pStart > 2 && <span className="px-1 text-gray-400">…</span>}
              </>
            )}

            {pages.map((i) => (
              <PageBtn key={i} current={i === page} onClick={() => onPageChange(i)}>
                {i}
              </PageBtn>
            ))}

            {pEnd < totalPages && (
              <>
                {pEnd < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
                <PageBtn onClick={() => onPageChange(totalPages)}>{totalPages}</PageBtn>
              </>
            )}

            <PageBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria="Next page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </PageBtn>
          </div>
        </div>
      )}
    </>
  );
}
