"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import Spinner from "@/components/ui/Spinner";
import { scoreLeadDetail } from "@/lib/leadScoring";

/**
 * Recommended Approach — Smart Prioritization card for one customer.
 * Self-contained: checks the feature toggle and fetches its own copies of
 * payments/PTP/activity-timeline (same endpoints RepaymentHistoryCard/
 * PtpSection/ActivityTimeline already use) rather than lifting state out
 * of those existing, working components. Renders nothing when the
 * feature is off or still loading — fully additive.
 */
export default function RecommendedApproachCard({ leadId, loan }) {
  const [state, setState] = useState({ loading: true, enabled: false, result: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      const policyRes = await clientFetch("/api/config/smart-prioritization");
      const enabled = policyRes.ok && policyRes.data?.success && Boolean(policyRes.data.config?.enabled);
      if (!enabled) {
        if (alive) setState({ loading: false, enabled: false, result: null });
        return;
      }

      const [payRes, ptpRes, tlRes] = await Promise.all([
        clientFetch(`/api/payments/fetch?leadId=${encodeURIComponent(leadId)}`),
        clientFetch(`/api/ptp/list?leadId=${encodeURIComponent(leadId)}`),
        clientFetch(`/api/leads/activity-timeline?lead_id=${encodeURIComponent(leadId)}`),
      ]);
      const payments = payRes.data?.data || [];
      const ptps = ptpRes.data?.data || [];
      const timeline = tlRes.data?.data || tlRes.data?.activities || tlRes.data?.result || [];

      const result = scoreLeadDetail({ loan, payments, ptps, timeline });
      if (alive) setState({ loading: false, enabled: true, result });
    })();
    return () => {
      alive = false;
    };
  }, [leadId, loan]);

  if (state.loading) {
    return (
      <div className="card mb-4 flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
        <Spinner size={16} /> Checking priority…
      </div>
    );
  }
  if (!state.enabled || !state.result) return null;

  const r = state.result;

  return (
    <div className="card mb-4 overflow-hidden" style={{ borderTop: `3px solid ${r.color}` }}>
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Recommended Approach</span>
        <span
          className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
          style={{ color: r.color, borderColor: r.color + "40", background: r.color + "14" }}
        >
          {r.band} · {r.score}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {r.recommendedChannel && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Best channel</span>
            <span className="font-semibold text-gray-800">{r.recommendedChannel}</span>
          </div>
        )}
        {r.recommendedWindow && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="shrink-0 text-gray-500">Best time</span>
            <span className="text-right font-semibold text-gray-800">{r.recommendedWindow}</span>
          </div>
        )}
        {r.reasons?.length > 0 && (
          <div className="border-t border-line pt-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Why</div>
            <ul className="space-y-1 text-xs text-gray-600">
              {r.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-gray-300">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="border-t border-line pt-2 text-[10px] leading-relaxed text-gray-400">
          Rule-based estimate, not a trained AI model.
        </p>
      </div>
    </div>
  );
}
