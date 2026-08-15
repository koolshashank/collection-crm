"use client";

import { useEffect, useState } from "react";

/**
 * Collapsible filter card — mirror of collection.php's .co-filter block.
 * Same fields (Start Date / End Date / Search), same labels and
 * placeholder, opens automatically when a filter is active.
 */
export default function FilterPanel({ startDate, endDate, search, dateLabel, filterActive, onApply, onClear }) {
  const [open, setOpen] = useState(filterActive);
  const [draft, setDraft] = useState({ startDate, endDate, search });

  /* Keep drafts in sync when the URL-driven values change */
  useEffect(() => {
    setDraft({ startDate, endDate, search });
  }, [startDate, endDate, search]);

  useEffect(() => {
    if (filterActive) setOpen(true);
  }, [filterActive]);

  function submit(e) {
    e.preventDefault();
    onApply(draft);
  }

  return (
    <div className="card mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/5 sm:px-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px] text-accent">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </div>
          <div>
            <div className="text-[0.87rem] font-semibold text-gray-800">Filters</div>
            <div className="mt-px text-[0.72rem] text-gray-400">
              Date range: {dateLabel}
              {search ? (
                <>
                  {" "}
                  &middot; Search: &ldquo;{search}&rdquo;
                </>
              ) : null}
            </div>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-[15px] w-[15px]">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <form onSubmit={submit} className="border-t border-line px-4 pb-5 pt-4 sm:px-5">
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Search</label>
              <input
                type="text"
                className="input"
                placeholder="Name, loan no, PAN"
                value={draft.search}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" className="btn-primary inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Apply Filters
            </button>
            <button type="button" onClick={onClear} className="btn-secondary">
              Clear
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
