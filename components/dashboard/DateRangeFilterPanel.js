"use client";

import { useEffect, useState } from "react";
import { CiIcon } from "@/components/client-info/icons";
import { Panel } from "./shared";

/**
 * Filter by Date Range — an alternate control surface for the same `range`
 * state the Collection Amount tiles above already expose via their own
 * quick-range buttons (same pattern as Settings' sidebar + tab bar: two
 * surfaces, one source of truth).
 */
export default function DateRangeFilterPanel({ range, onApply }) {
  const [start, setStart] = useState(range.startDate);
  const [end, setEnd] = useState(range.endDate);

  useEffect(() => {
    setStart(range.startDate);
    setEnd(range.endDate);
  }, [range.startDate, range.endDate]);

  return (
    <Panel className="flex flex-col items-center px-5 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-light text-accent-dark">
        <CiIcon name="cal" size={20} strokeWidth={2} />
      </span>
      <h4 className="mt-3 font-display text-[0.9rem] font-bold text-gray-800">Filter by Date Range</h4>
      <p className="mt-1 text-[0.72rem] text-gray-400">Change the date range to see recovery metrics</p>

      <div className="mt-4 w-full space-y-2.5 text-left">
        <div>
          <label className="label !mb-1 !text-[0.62rem]">From</label>
          <input type="date" className="input !py-1.5 text-xs" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label !mb-1 !text-[0.62rem]">To</label>
          <input type="date" className="input !py-1.5 text-xs" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <button
        type="button"
        className="btn-primary mt-4 w-full"
        onClick={() => onApply({ startDate: start, endDate: end })}
      >
        Apply Filter
      </button>
    </Panel>
  );
}
