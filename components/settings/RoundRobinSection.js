"use client";

import ToggleRow from "./ToggleRow";

const RotateIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);

/**
 * Round Robin Distribution card — a single global switch. When on, the
 * Assign Leads page shows the Round Robin Distribution card and agents can
 * one-click distribute unassigned leads across Collection Executives. When
 * off, the card is hidden on Assign Leads and the underlying API rejects
 * the request too (so it can't be triggered by URL/API alone either).
 */
export default function RoundRobinSection({ enabled, onToggle }) {
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <RotateIcon color="currentColor" />
            </span>
            Round Robin Distribution
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            One-click, even distribution of unassigned leads across Collection Executives
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Turning this <strong>off</strong> removes the Round Robin Distribution card from the Assign Leads page for
            everyone, and blocks the distribute action even if triggered directly. Turning it <strong>on</strong> restores
            it immediately.
          </span>
        </div>

        <ToggleRow
          icon={<RotateIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Enable Round Robin Distribution"
          sub="Shows the card on Assign Leads and allows one-click distribution"
          on={enabled}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}
