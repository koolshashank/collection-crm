"use client";

import ToggleRow from "./ToggleRow";

const BrainIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <path d="M9.5 2a3.5 3.5 0 00-3.5 3.5v.5A3 3 0 003 9v1a3 3 0 00-1 2.24V13a3 3 0 003 3h.5a3.5 3.5 0 003.5 3.5h2A3.5 3.5 0 0014.5 16H15a3 3 0 003-3v-.76A3 3 0 0017 10V9a3 3 0 00-3-3v-.5A3.5 3.5 0 0010.5 2h-1z" />
    <line x1="9" y1="6" x2="9" y2="18" />
    <line x1="14" y1="6" x2="14" y2="18" />
  </svg>
);

/**
 * Smart Prioritization card — a single global switch. When on, the Leads
 * list shows a rule-based Priority column and client-info shows a
 * Recommended Approach card; when off, neither computes or renders
 * anything (fully inert, no extra API calls).
 */
export default function SmartPrioritizationSection({ enabled, onToggle }) {
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <BrainIcon color="currentColor" />
            </span>
            Smart Prioritization
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Rule-based priority score to help agents work the right accounts first</div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            This is a transparent, rule-based score (overdue status, payment history, promise-to-pay follow-through,
            amount at stake) — not a trained AI model. Turning it <strong>on</strong> adds a Priority column to the
            Leads list and a Recommended Approach card to each customer's profile. Turning it <strong>off</strong>{" "}
            removes both immediately.
          </span>
        </div>

        <ToggleRow
          icon={<BrainIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Enable Smart Prioritization"
          sub="Priority column on Leads + Recommended Approach on customer profiles"
          on={enabled}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}
