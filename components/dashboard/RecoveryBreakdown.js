"use client";

import { useState } from "react";
import { Panel, PanelHead, StatsStrip } from "./shared";
import { fmtInr } from "./format";
import RecoveryBreakdownModal from "./RecoveryBreakdownModal";

/* Same static distribution as dashboard.php's $recItems — illustrative
   until a real recovery-status API exists; the modal says so explicitly. */
export const REC_ITEMS = [
  { name: "Recovered", pct: 58, color: "#1E7E5E" },
  { name: "Part Payment", pct: 18, color: "#e8a33d" },
  { name: "Not Recovered", pct: 19, color: "#d64545" },
  { name: "Settled", pct: 5, color: "#3b6ea5" },
];

/** Recovery Breakdown panel — mirror of dashboard.php's right column.
    `totalAmount` is the real rupee collection total for the selected
    range — used to turn the static percentages into rupee figures. */
export default function RecoveryBreakdown({ totalAmount }) {
  const [open, setOpen] = useState(false);
  const hasTotal = Number(totalAmount) > 0;
  const recoveredAmt = hasTotal ? (Number(totalAmount) * 0.58) : 0;
  const pendingAmt = hasTotal ? (Number(totalAmount) * 0.19) : 0;

  return (
    <>
      <Panel className="cursor-pointer transition hover:shadow-pop" onClick={() => setOpen(true)}>
        <PanelHead
          title={
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Recovery Breakdown
            </>
          }
        />

        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
          {REC_ITEMS.map((ri) => (
            <div key={ri.name} className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: ri.color }} />
              <span className="min-w-[100px] text-[0.77rem] font-medium text-gray-800 sm:min-w-[115px]">{ri.name}</span>
              <div className="h-[7px] flex-1 overflow-hidden rounded-md bg-surface">
                <div className="h-full rounded-md transition-all duration-700" style={{ width: `${ri.pct}%`, background: ri.color }} />
              </div>
              <span className="min-w-[38px] text-right text-[0.68rem] font-bold" style={{ color: ri.color }}>
                {ri.pct}%
              </span>
            </div>
          ))}
        </div>

        {/* Insight chips */}
        <div className="flex flex-wrap gap-2 px-4 pb-3.5 sm:px-5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.69rem] font-semibold"
            style={{ background: "rgba(30,126,94,.1)", color: "#1E7E5E", border: "1px solid rgba(30,126,94,.2)" }}
          >
            ✓ {hasTotal ? fmtInr(recoveredAmt) : "—"} recovered
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.69rem] font-semibold"
            style={{ background: "rgba(214,69,69,.08)", color: "#d64545", border: "1px solid rgba(214,69,69,.2)" }}
          >
            ⚠ {hasTotal ? fmtInr(pendingAmt) : "—"} pending
          </span>
        </div>

        <StatsStrip
          items={[
            { value: "58%", label: "Recovery Rate", color: "#1E7E5E" },
            { value: "19%", label: "Not Recovered", color: "#d64545" },
          ]}
        />
      </Panel>

      <RecoveryBreakdownModal open={open} onClose={() => setOpen(false)} totalAmount={totalAmount} />
    </>
  );
}
