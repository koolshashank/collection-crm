"use client";

import { useEffect, useState } from "react";
import { CiIcon } from "@/components/client-info/icons";
import { REPORT_TYPES, TEAM_OPTIONS, SOURCE_OPTIONS } from "@/lib/reportsMock";

/**
 * Filters — Date Range / Compare To / Report Type / Team / Source. Report
 * Type is what actually switches the main content area between the three
 * report views; everything else is a draft applied on "Apply Filters"
 * (mirrors the Dashboard's Filter-by-Date-Range panel pattern).
 */
export default function ReportsFilterPanel({ filters, defaults, onApply }) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => setDraft(filters), [filters]);

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-gray-800">
        <CiIcon name="filter" size={14} strokeWidth={2} className="text-accent" />
        Filters
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="label !text-[10.5px]">Date Range</label>
          <div className="flex items-center gap-1.5">
            <input type="date" className="input !py-1.5 text-xs" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="input !py-1.5 text-xs" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label !text-[10.5px]">Compare To</label>
          <div className="flex items-center gap-1.5">
            <input type="date" className="input !py-1.5 text-xs" value={draft.compareStart} onChange={(e) => set("compareStart", e.target.value)} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="input !py-1.5 text-xs" value={draft.compareEnd} onChange={(e) => set("compareEnd", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label !text-[10.5px]">Report Type</label>
          <select className="input" value={draft.reportType} onChange={(e) => set("reportType", e.target.value)}>
            {REPORT_TYPES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label !text-[10.5px]">Team</label>
          <select className="input" value={draft.team} onChange={(e) => set("team", e.target.value)}>
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label !text-[10.5px]">Source</label>
          <select className="input" value={draft.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-primary w-full" onClick={() => onApply(draft)}>
          Apply Filters
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => {
            setDraft(defaults);
            onApply(defaults);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
