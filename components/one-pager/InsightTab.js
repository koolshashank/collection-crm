"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import Spinner from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";
import RecommendedApproachCard from "@/components/client-info/RecommendedApproachCard";

/**
 * Insight tab — merges everything that's happened with this customer
 * (calls/WhatsApp/field events, PTPs, dispositions, payments) into one
 * chronological, connected-dot timeline, plus the Smart Prioritization
 * "Recommended Approach" card. Colors/icons mirror the category scheme
 * already established in components/client-info/ActivityTimeline.js
 * (re-implemented locally rather than imported, since client-info is
 * being phased out and this tab shouldn't depend on it).
 */

const CATEGORY_META = {
  payments: { color: "#0f9b8e", icon: "card" },
  ptp: { color: "#7c3aed", icon: "cal" },
  field: { color: "#3b6ea5", icon: "user" },
  status: { color: "#1E7E5E", icon: "check" },
  disposition: { color: "#e8a33d", icon: "doc" },
  default: { color: "#6b7280", icon: "warn" },
};

function categorizeActivity(a) {
  const t = `${a.activity_type || a.type || a.category || ""} ${a.description || ""}`.toLowerCase();
  if (t.includes("payment") || t.includes("link") || t.includes("sms") || t.includes("whatsapp") || t.includes("email")) return "payments";
  if (t.includes("ptp") || t.includes("promise")) return "ptp";
  if (t.includes("field") || t.includes("visit") || t.includes("assign")) return "field";
  if (t.includes("status") || t.includes("closed") || t.includes("recover")) return "status";
  return "default";
}

function pick(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${fmtDate(v)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function inr(v) {
  const n = Number(v) || 0;
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function InsightTab({ leadId, loan }) {
  const [state, setState] = useState({ loading: true, entries: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      setState({ loading: true, entries: [] });
      const loanNo = loan?.loan_no || "";

      const [tlRes, ptpRes, payRes, dispRes] = await Promise.all([
        clientFetch(`/api/leads/activity-timeline?lead_id=${encodeURIComponent(leadId)}`),
        clientFetch(`/api/ptp/list?leadId=${encodeURIComponent(leadId)}`),
        clientFetch(`/api/payments/fetch?leadId=${encodeURIComponent(leadId)}`),
        loanNo
          ? clientFetch(`/api/disposition/history?search=${encodeURIComponent(loanNo)}&limit=50`)
          : Promise.resolve({ ok: true, data: { rows: [] } }),
      ]);
      if (!alive) return;

      const entries = [];

      const timeline = tlRes.data?.data || tlRes.data?.activities || tlRes.data?.result || [];
      for (const a of timeline) {
        const date = pick(a, ["created_at", "activity_date", "timestamp"]);
        if (!date) continue;
        entries.push({
          date,
          title: a.activity_type || a.type || "Activity",
          subtitle: a.description || null,
          category: categorizeActivity(a),
        });
      }

      const ptps = ptpRes.data?.data || [];
      for (const p of ptps) {
        const date = pick(p, ["created_at", "ptp_date"]);
        if (!date) continue;
        const due = p.ptp_date ? ` by ${fmtDate(p.ptp_date)}` : "";
        entries.push({
          date,
          title: `Promise to Pay${p.ptp_amount ? ` — ${inr(p.ptp_amount)}` : ""}${due}`,
          subtitle: p.action_taken || p.remarks || null,
          category: "ptp",
        });
      }

      const payments = payRes.data?.data || [];
      for (const pmt of payments) {
        const date = pick(pmt, ["payment_date", "created_at"]);
        if (!date) continue;
        entries.push({
          date,
          title: `Payment received — ${inr(pmt.received_amount ?? pmt.amount)}`,
          subtitle: pmt.payment_method || null,
          category: "payments",
        });
      }

      if (dispRes.ok) {
        const rawRows = dispRes.data?.rows || [];
        const scopedRows = rawRows.filter((r) => {
          const rLead = String(pick(r, ["lead_id", "leadId"]) ?? "");
          const rLoan = String(pick(r, ["loan_no", "loanNo", "loan_id"]) ?? "");
          return (leadId && rLead === String(leadId)) || (loanNo && rLoan === String(loanNo));
        });
        for (const d of scopedRows) {
          const date = pick(d, ["created_at", "createdAt", "created_on"]);
          if (!date) continue;
          entries.push({
            date,
            title: pick(d, ["disposition_label", "dispositionLabel", "disposition_code", "dispositionCode"]) || "Disposition logged",
            subtitle: pick(d, ["remarks", "remark", "comment"]),
            category: "disposition",
          });
        }
      }

      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      if (alive) setState({ loading: false, entries });
    })();
    return () => {
      alive = false;
    };
  }, [leadId, loan]);

  return (
    <div>
      <RecommendedApproachCard leadId={leadId} loan={loan} />

      <div className="card p-5">
        <div className="mb-4 text-sm font-bold text-gray-800">Activity Timeline</div>
        {state.loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Spinner size={18} /> Loading activity…
          </div>
        ) : state.entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No recorded activity yet for this customer.</div>
        ) : (
          <div className="relative pl-2">
            <div className="absolute bottom-2 left-[17px] top-2 w-px bg-line" />
            <div className="space-y-5">
              {state.entries.map((e, i) => {
                const meta = CATEGORY_META[e.category] || CATEGORY_META.default;
                return (
                  <div key={i} className="relative flex gap-3">
                    <span
                      className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: meta.color, background: meta.color + "1a", color: meta.color }}
                    >
                      <CiIcon name={meta.icon} size={14} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="text-sm font-semibold text-gray-800">{e.title}</div>
                      {e.subtitle && <div className="mt-0.5 text-xs text-gray-500">{e.subtitle}</div>}
                      <div className="mt-1 text-[11px] text-gray-400">{fmtDateTime(e.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
