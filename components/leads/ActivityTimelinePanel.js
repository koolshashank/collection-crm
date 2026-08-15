"use client";

import { useEffect, useMemo, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { CiIcon } from "@/components/client-info/icons";

/* Category color + icon — same mapping as components/one-pager/InsightTab.js's
   CATEGORY_META, kept in sync so both timelines look/feel identical. */
const CATEGORY_META = {
  payments: { color: "#0f9b8e", icon: "card" },
  ptp: { color: "#7c3aed", icon: "cal" },
  field: { color: "#3b6ea5", icon: "user" },
  status: { color: "#1E7E5E", icon: "check" },
  disposition: { color: "#e8a33d", icon: "doc" },
  default: { color: "#6b7280", icon: "warn" },
};

const FILTERS = ["all", "payments", "ptp", "field", "status", "disposition"];
const FILTER_LABELS = {
  all: "Filter", payments: "Payments", ptp: "PTP", field: "Field", status: "Status", disposition: "Disposition",
};

function pick(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/* lpTlCategory — verbatim, used for activity-timeline rows only */
function categoryOf(a) {
  const t = ((a.activity_type || a.type || a.category || "") + " " + (a.description || "")).toLowerCase();
  if (t.includes("payment") || t.includes("link") || t.includes("sms") || t.includes("whatsapp") || t.includes("email")) return "payments";
  if (t.includes("ptp") || t.includes("promise")) return "ptp";
  if (t.includes("field") || t.includes("visit") || t.includes("assign")) return "field";
  if (t.includes("status") || t.includes("closed") || t.includes("recover")) return "status";
  return "default";
}

function fmtDateLabel(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}
function fmtTime(raw) {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
  } catch {
    return "";
  }
}
function inr(v) {
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/* lpBuildParsedDesc — same label-splitting logic, rendered with JSX (activity-sourced entries only) */
const KNOWN_LABELS = [
  "PTP Added Successfully", "PTP Type", "PTP Amount", "PTP Date",
  "Outstanding Amount", "Added At", "Loan No", "Added By",
  "Action Taken", "Action Required", "Remarks", "Employee ID",
];

function parseDesc(desc) {
  if (!desc) return { plain: "" };
  const splitPattern = new RegExp(
    "(?=(?:" + KNOWN_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s*:?)", "g"
  );
  const rawParts = desc.split(splitPattern).map((s) => s.trim()).filter(Boolean);
  if (rawParts.length <= 1) return { plain: desc };

  let leadText = "";
  const fields = [];
  let heroAmount = null;
  let remarksText = null;

  rawParts.forEach((part) => {
    const m = part.match(/^([A-Za-z ]+?)\s*:\s*(.+)$/);
    if (m) {
      const label = m[1].trim();
      const value = m[2].trim();
      if (/^remarks$/i.test(label)) remarksText = value;
      else if (/amount/i.test(label) && !heroAmount) heroAmount = { label, value };
      else fields.push({ label, value });
    } else if (/^remarks\b/i.test(part)) {
      remarksText = part.replace(/^remarks\s*/i, "").trim();
    } else if (!leadText) {
      leadText = part;
    } else {
      fields.push({ label: "", value: part });
    }
  });

  return { leadText, fields, heroAmount, remarksText };
}

function ParsedDesc({ desc }) {
  const p = parseDesc(desc);
  if (p.plain !== undefined) return <div className="text-xs leading-relaxed text-gray-600">{p.plain}</div>;
  return (
    <div className="text-xs leading-relaxed text-gray-600">
      {p.leadText && <p className="mb-2 text-xs font-semibold text-gray-800">{p.leadText}</p>}
      {p.heroAmount && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-amber/40 bg-amber/10 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber">{p.heroAmount.label}</span>
          <span className="text-sm font-bold text-amber">{p.heroAmount.value}</span>
        </div>
      )}
      {p.fields?.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
          {p.fields.map((f, i) => (
            <div key={i} className="min-w-0">
              {f.label && (
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{f.label}</p>
              )}
              <p className="break-words text-xs font-medium text-gray-700">{f.value}</p>
            </div>
          ))}
        </div>
      )}
      {p.remarksText && (
        <div className="mt-2.5 rounded-lg border border-info/30 bg-blue-50 px-3 py-2">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-info">Remarks</p>
          <p className="text-xs font-medium leading-relaxed text-navy">{p.remarksText}</p>
        </div>
      )}
    </div>
  );
}

export default function ActivityTimelinePanel({ lead, onClose }) {
  const [state, setState] = useState({ loading: true, error: false, entries: [] });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setState({ loading: true, error: false, entries: [] });

      const [tlRes, dispRes] = await Promise.all([
        clientFetch(`/api/leads/activity-timeline?lead_id=${encodeURIComponent(lead.leadId)}`),
        lead.loanId
          ? clientFetch(`/api/disposition/history?search=${encodeURIComponent(lead.loanId)}&limit=50`)
          : Promise.resolve({ ok: true, data: { rows: [] } }),
      ]);
      if (!alive) return;

      if (tlRes.status === 0 || (!tlRes.ok && !tlRes.data)) {
        setState({ loading: false, error: true, entries: [] });
        return;
      }

      const entries = [];

      const activities = tlRes.data?.data || tlRes.data?.activities || tlRes.data?.result || [];
      for (const a of activities) {
        const date = a.created_at || a.activity_date || a.timestamp || "";
        entries.push({
          date,
          category: categoryOf(a),
          title: a.activity_type || a.type || a.category || "Activity",
          tag: a.tag || a.label || "Info",
          desc: a.description || a.message || a.remarks || a.details || "",
          source: "activity",
        });
      }

      if (dispRes.ok) {
        const rawRows = dispRes.data?.rows || [];
        const scopedRows = rawRows.filter((r) => {
          const rLead = String(pick(r, ["lead_id", "leadId"]) ?? "");
          const rLoan = String(pick(r, ["loan_no", "loanNo", "loan_id"]) ?? "");
          return (lead.leadId && rLead === String(lead.leadId)) || (lead.loanId && rLoan === String(lead.loanId));
        });
        for (const d of scopedRows) {
          const date = pick(d, ["created_at", "createdAt", "created_on"]);
          if (!date) continue;
          entries.push({
            date,
            category: "disposition",
            title: pick(d, ["disposition_label", "dispositionLabel", "disposition_code", "dispositionCode"]) || "Disposition logged",
            tag: "Disposition",
            desc: pick(d, ["remarks", "remark", "comment"]) || "",
            ptpAmount: pick(d, ["ptp_amount", "ptpAmount"]),
            ptpDate: pick(d, ["ptp_date", "ptpDate"]),
            source: "disposition",
          });
        }
      }

      entries.sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first
      if (alive) setState({ loading: false, error: false, entries });
    })();
    return () => {
      alive = false;
    };
  }, [lead.leadId, lead.loanId]);

  const filtered = useMemo(
    () => (filter === "all" ? state.entries : state.entries.filter((e) => e.category === filter)),
    [state.entries, filter]
  );

  const cycleFilter = () => setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length]);

  /* lpTimelineDownload — same CSV shape, now covering the merged entries too */
  const download = () => {
    if (!state.entries.length) return;
    const rows = ["Date,Time,Category,Title,Description"];
    state.entries.forEach((e) => {
      const date = e.date ? String(e.date).split("T")[0] : "";
      const time = fmtTime(e.date);
      const desc = (e.desc || "").replace(/,/g, ";");
      rows.push([date, time, e.category, e.title, desc].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timeline_" + lead.leadId + "_" + new Date().toISOString().split("T")[0] + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sLow = (lead.status || "").toLowerCase();
  const statusCls = sLow.includes("not")
    ? "bg-red-50 text-danger border-red-200"
    : sLow.includes("part")
    ? "bg-amber/10 text-amber border-amber/40"
    : sLow.includes("recover") || sLow.includes("closed")
    ? "bg-accent-light text-accent-dark border-accent/40"
    : "bg-blue-50 text-info border-info/40";

  return (
    <>
      <div className="fixed inset-0 z-[700] bg-navy/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-[701] flex w-[440px] max-w-[98vw] flex-col bg-panel shadow-pop">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-4">
          <span className="flex items-center gap-2 font-display text-base font-bold text-gray-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-info">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Disposition History
          </span>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-bold text-gray-800">{lead.name}</span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              Loan ID : <span className="font-semibold text-info">{lead.loanId}</span>
              <span>|</span>
              <span className={`badge border ${statusCls}`}>{lead.status || "Unknown"}</span>
            </span>
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
          <span className="text-xs text-gray-400">
            {state.loading ? "Loading…" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
          </span>
          <span className="flex gap-1.5">
            <button className="btn-secondary !px-2.5 !py-1 !text-xs" title="Download" onClick={download}>
              ⬇
            </button>
            <button
              className={`btn-secondary !px-2.5 !py-1 !text-xs ${filter !== "all" ? "!border-info/40 !bg-blue-50 !text-info" : ""}`}
              onClick={cycleFilter}
            >
              {FILTER_LABELS[filter]}
            </button>
          </span>
        </div>

        {/* Body — connected dot-and-line timeline, same pattern as InsightTab.js */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-16">
          {state.loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-xs text-gray-400">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-info" />
              Loading timeline…
            </div>
          ) : state.error ? (
            <div className="px-1 py-16 text-center text-xs text-gray-400">
              Could not load timeline.
              <br />
              <span className="text-[10px]">Check network or API.</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-1 py-16 text-center text-xs text-gray-400">No records found.</div>
          ) : (
            <div className="relative pl-2">
              <div className="absolute bottom-2 left-[17px] top-2 w-px bg-line" />
              <div className="space-y-4">
                {filtered.map((e, i) => {
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
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-gray-800">{e.title}</span>
                          <span className="badge whitespace-nowrap border border-purple-200 bg-white text-purple-600">
                            {e.tag}
                          </span>
                        </div>
                        {e.source === "disposition" ? (
                          <div className="text-xs leading-relaxed text-gray-600">
                            {e.desc && <p>{e.desc}</p>}
                            {e.ptpAmount && (
                              <p className="mt-1 font-semibold text-gray-800">
                                PTP: {inr(e.ptpAmount)}{e.ptpDate ? ` by ${fmtDateLabel(e.ptpDate)}` : ""}
                              </p>
                            )}
                          </div>
                        ) : (
                          <ParsedDesc desc={e.desc} />
                        )}
                        <div className="mt-1 flex justify-end text-[10px] text-gray-400">
                          {fmtDateLabel(e.date)} {fmtTime(e.date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
