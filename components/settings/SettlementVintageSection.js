"use client";

import ToggleRow from "./ToggleRow";
import { DPD_BUCKETS } from "@/lib/dpdBuckets";

const PercentIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

/**
 * Settlement Vintage Policy — admin-editable "settlement % of outstanding"
 * per DPD bucket (same 7 buckets as the vintage-analysis report). When a
 * collection agent raises a settlement request, the case's DPD is looked up
 * against this table to show a *suggested* settlement % / amount next to
 * the form — purely informational. It never changes the actual amount the
 * agent enters, nor anything in the approval workflow.
 */
export default function SettlementVintageSection({ config, onChange }) {
  const percents = config?.percents ?? {};

  function setPercent(key, value) {
    const num = value === "" ? "" : Math.min(100, Math.max(0, Number(value) || 0));
    onChange({ ...config, percents: { ...percents, [key]: num } });
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <PercentIcon color="currentColor" />
            </span>
            Settlement Vintage Policy
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            Suggested settlement % of outstanding, based on how old (DPD) the case is
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            This only shows a <strong>suggested</strong> settlement % and amount on the Raise Settlement Request form,
            worked out from the case&apos;s DPD. It does not change the settlement amount the agent enters, and has no
            effect on submission or approval — the actual settlement process stays exactly as it is today.
          </span>
        </div>

        <ToggleRow
          icon={<PercentIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Show vintage-based settlement suggestion"
          sub="Turn off to hide the suggestion on the settlement request form"
          on={Boolean(config?.enabled)}
          onChange={(v) => onChange({ ...config, enabled: v })}
        />

        <div className="mt-4">
          <label className="label">Settlement % by DPD bucket</label>
          <div className="overflow-hidden rounded-lg border border-line">
            {DPD_BUCKETS.map((b, i) => (
              <div
                key={b.key}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
                  {b.label}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input w-20 text-right"
                    value={percents[b.key] ?? ""}
                    onChange={(e) => setPercent(b.key, e.target.value)}
                  />
                  <span className="text-sm font-semibold text-gray-500">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-xs text-gray-400">
            E.g. a case with 45 days DPD falls in the &quot;31–60 DPD&quot; bucket — the suggestion shown will be that
            bucket&apos;s % of the outstanding amount.
          </div>
        </div>
      </div>
    </div>
  );
}
