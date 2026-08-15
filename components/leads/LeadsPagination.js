"use client";

import { numFmt } from "./leadUtils";

/**
 * Block pagination — identical maths to lead.php:
 * 8 pages per block, prev goes to (startPage - 1), next to (endPage + 1).
 */
const PAGES_TO_SHOW = 8;

export default function LeadsPagination({
  currentPage,
  totalPages,
  total,
  limit,
  onGotoPage,
  onChangeLimit,
}) {
  const currentBlock = Math.max(1, Math.ceil(currentPage / PAGES_TO_SHOW));
  const startPage = (currentBlock - 1) * PAGES_TO_SHOW + 1;
  const endPage = Math.min(startPage + PAGES_TO_SHOW - 1, totalPages);

  const pages = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const Btn = ({ children, onClick, disabled, current, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-sm font-medium transition ${
        current
          ? "border-accent bg-accent font-bold text-white"
          : "border-line bg-panel text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-3.5">
      <div className="text-xs text-gray-500">
        Page <strong className="text-gray-700">{currentPage}</strong> of{" "}
        <strong className="text-gray-700">{totalPages}</strong>
        <span className="mx-2" />
        {numFmt(total)} total records
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Btn disabled={currentBlock <= 1} title="Previous block" onClick={() => onGotoPage(startPage - 1)}>
          ‹
        </Btn>
        {pages.map((p) => (
          <Btn key={p} current={p === currentPage} onClick={() => onGotoPage(p)}>
            {p}
          </Btn>
        ))}
        <Btn disabled={endPage >= totalPages} title="Next block" onClick={() => onGotoPage(endPage + 1)}>
          ›
        </Btn>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-500">
        <span>Per page</span>
        <select
          className="input !w-auto !py-1"
          value={limit}
          onChange={(e) => onChangeLimit(e.target.value)}
        >
          {[10, 25, 50, 100].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
