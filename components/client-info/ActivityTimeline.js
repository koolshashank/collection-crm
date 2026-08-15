"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { CiIcon } from "./icons";
import { CiEmpty, InlineSpinner } from "./SectionCard";

/* Category detection + colors — verbatim from ciTlCategory()/CI_TL_COLORS */
const TL_COLORS = { payments: "#0f9b8e", ptp: "#7c3aed", field: "#3b6ea5", status: "#1E7E5E", default: "#6b7280" };
const TL_ICONS = { payments: "card", ptp: "cal", field: "user", status: "check", default: "warn" };

function tlCategory(a) {
  const t = ((a.activity_type || a.type || a.category || "") + " " + (a.description || "")).toLowerCase();
  if (t.indexOf("payment") > -1 || t.indexOf("link") > -1 || t.indexOf("sms") > -1 || t.indexOf("whatsapp") > -1 || t.indexOf("email") > -1) return "payments";
  if (t.indexOf("ptp") > -1 || t.indexOf("promise") > -1) return "ptp";
  if (t.indexOf("field") > -1 || t.indexOf("visit") > -1 || t.indexOf("assign") > -1) return "field";
  if (t.indexOf("status") > -1 || t.indexOf("closed") > -1 || t.indexOf("recover") > -1) return "status";
  return "default";
}

function tlFmtTime(raw) {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

/**
 * Activity Timeline — compact sidebar feed.
 * Port of ciLoadTimeline() (get_activity_timeline.php → /api/leads/activity-timeline).
 */
export default function ActivityTimeline({ leadId }) {
  const [state, setState] = useState({ loading: true, errorMsg: null, items: [] });

  const load = useCallback(async () => {
    setState({ loading: true, errorMsg: null, items: [] });
    const res = await clientFetch(`/api/leads/activity-timeline?lead_id=${encodeURIComponent(leadId)}`);
    if (res.status === 0 || (!res.ok && !res.data)) {
      setState({ loading: false, errorMsg: `Could not load activity timeline (${res.error || "network error"}).`, items: [] });
      return;
    }
    const d = res.data || {};
    if (d && d.success === false) {
      setState({ loading: false, errorMsg: d.message || "Could not load timeline.", items: [] });
      return;
    }
    const items = d.data || d.activities || d.result || [];
    /* newest first */
    items.sort((a, b) => {
      const da = new Date(a.created_at || a.activity_date || a.timestamp || 0);
      const db = new Date(b.created_at || b.activity_date || b.timestamp || 0);
      return db - da;
    });
    setState({ loading: false, errorMsg: null, items });
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const count = state.items.length;

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2 font-display text-base text-gray-800">
          <CiIcon name="clock" size={17} className="text-accent" />
          Activity Timeline
        </div>
        <span className="text-[11px] font-semibold text-gray-500">
          {state.loading || state.errorMsg ? "" : `${count} activit${count === 1 ? "y" : "ies"}`}
        </span>
      </div>
      <div className="px-3.5 py-2.5">
        <div className="max-h-[420px] overflow-y-auto">
          {state.loading ? (
            <InlineSpinner />
          ) : state.errorMsg ? (
            <CiEmpty error>{state.errorMsg}</CiEmpty>
          ) : !count ? (
            <CiEmpty>No activity recorded yet for this lead.</CiEmpty>
          ) : (
            state.items.map((a, i) => {
              const cat = tlCategory(a);
              const type = a.activity_type || a.type || a.category || "Activity";
              const desc = a.description || a.message || a.remarks || a.details || "";
              const time = tlFmtTime(a.created_at || a.activity_date || a.timestamp || "");
              return (
                <div key={i} className="flex gap-2.5 border-b border-line px-1 py-2.5 last:border-b-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: TL_COLORS[cat] || TL_COLORS.default }}
                  >
                    <CiIcon name={TL_ICONS[cat] || TL_ICONS.default} size={13} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-gray-800">{type}</div>
                    {desc ? <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">{desc}</div> : null}
                    <div className="mt-1 text-[10px] text-gray-400">{time}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
