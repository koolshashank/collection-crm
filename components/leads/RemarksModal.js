"use client";

import { useEffect, useState } from "react";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

/* Same 8 remark types & colors as lead.php */
const REMARK_TYPES = [
  { value: "follow_up", label: "Follow Up", color: "#3c64aa" },
  { value: "payment", label: "Payment", color: "#1E7E5E" },
  { value: "dispute", label: "Dispute", color: "#C0392B" },
  { value: "ptp", label: "PTP Update", color: "#9b59b6" },
  { value: "legal", label: "Legal", color: "#b91c1c" },
  { value: "field_visit", label: "Field Visit", color: "#b7770d" },
  { value: "settlement", label: "Settlement", color: "#1a6fa8" },
  { value: "general", label: "General", color: "#6b7280" },
];

const FOLLOWUP_TYPES = ["follow_up", "ptp", "field_visit"];

export default function RemarksModal({ lead, onClose }) {
  const toast = useToast();
  const [type, setType] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [text, setText] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [pan, setPan] = useState({ state: "loading", value: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* lpRemarksFetchPAN — same lookup & fallbacks */
  useEffect(() => {
    if (!lead.leadId) return;
    let alive = true;
    (async () => {
      const res = await clientFetch(`/api/leads/pan?lead_id=${encodeURIComponent(lead.leadId)}`);
      if (!alive) return;
      if (res.status === 0) { setPan({ state: "error", value: "" }); return; }
      const p = res.data?.pan || res.data?.pan_number || res.data?.data?.pan || "";
      setPan(p ? { state: "ok", value: p } : { state: "na", value: "" });
    })();
    return () => { alive = false; };
  }, [lead.leadId]);

  const dpd = parseInt(lead.dpd, 10) || 0;
  const statusLow = (lead.status || "").toLowerCase();
  const statusColor = statusLow.includes("not")
    ? "#C0392B" : statusLow.includes("part")
    ? "#b7770d" : statusLow.includes("recover")
    ? "#1E7E5E" : "#3c64aa";

  const infoCells = [
    { label: "Loan No", node: <b style={{ color: "#1a3a6b" }}>{lead.loanId || ""}</b> },
    { label: "Customer No", node: <b className="text-gray-700">{lead.custNo || ""}</b> },
    {
      label: "PAN",
      node:
        pan.state === "loading" ? (
          <span className="italic text-gray-400">Fetching…</span>
        ) : pan.state === "ok" ? (
          <b className="font-mono tracking-widest" style={{ color: "#1a3a6b" }}>{pan.value}</b>
        ) : pan.state === "na" ? (
          <span className="text-gray-400">Not available</span>
        ) : (
          <span className="text-gray-400" />
        ),
    },
    { label: "Mobile", node: <b className="text-gray-700">{lead.mobile || ""}</b> },
    {
      label: "DPD",
      node: <b style={{ color: dpd > 30 ? "#C0392B" : "#1E7E5E" }}>{dpd === 0 ? "No DPD" : `${dpd} days`}</b>,
    },
    { label: "Status", node: <b style={{ color: statusColor }}>{lead.status || ""}</b> },
  ];

  const showFollowup = FOLLOWUP_TYPES.includes(type);

  /* lpSubmitRemarks — identical validation & payload param names */
  const submit = async () => {
    if (!type) return toast.error("Select a remark type");
    if (!date) return toast.error("Select a remark date");
    const trimmed = text.trim();
    if (!trimmed) return toast.error("Enter remark text");
    if (trimmed.length < 5) return toast.error("Remarks too short — please add more detail");

    setSaving(true);
    const res = await postJson("/api/remarks/submit", {
      lead_id: lead.leadId,
      loan_id: lead.loanId,
      remark_date: date,
      remark_type: type,
      remark_text: trimmed,
      followup_date: followupDate || null,
      mobile: lead.mobile,
    });
    setSaving(false);
    if (res.status === 0) return toast.error("Network error — please try again");
    if (res.data?.success) {
      toast.success("Remarks saved for " + lead.name);
      onClose();
    } else {
      toast.error(res.data?.message || "Failed to save remarks");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-navy/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-navy to-navy-light px-5 py-4">
          <div>
            <p className="font-display text-base text-white">Add Remarks</p>
            <p className="mt-0.5 text-xs text-white/75">
              {lead.name}{lead.loanId ? ` — ${lead.loanId}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/30"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap border-b border-line bg-surface">
          {infoCells.map((c, i) => (
            <div key={c.label} className={`min-w-[120px] flex-1 px-3.5 py-2.5 ${i < infoCells.length - 1 ? "border-r border-line" : ""}`}>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
              <p className="text-sm">{c.node}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-5">
          {/* Remark Date */}
          <div>
            <label className="label mb-1 block">Remark Date <span className="text-danger">*</span></label>
            <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Remark Type */}
          <div>
            <label className="label mb-1.5 block">Remark Type <span className="text-danger">*</span></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {REMARK_TYPES.map((rt) => {
                const active = type === rt.value;
                return (
                  <label
                    key={rt.value}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                      active ? "" : "border-line bg-surface hover:border-gray-300"
                    }`}
                    style={active ? { borderColor: rt.color, background: rt.color + "14" } : undefined}
                  >
                    <input
                      type="radio"
                      name="lpRemarkType"
                      value={rt.value}
                      checked={active}
                      onChange={() => setType(rt.value)}
                      className="hidden"
                    />
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: rt.color }} />
                    <span className="text-[11px] font-semibold leading-tight text-gray-800">{rt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Remarks text */}
          <div>
            <label className="label mb-1 block">Remarks <span className="text-danger">*</span></label>
            <textarea
              rows={4}
              className="input min-h-[90px] w-full resize-y"
              placeholder="Enter your remarks here (e.g. Customer contacted, promised to pay by 30th. Agreed on partial amount of 5,000)"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
            />
            <div className="mt-1 flex justify-between">
              <span className="text-[11px] text-gray-400">{text.length} / 500 chars</span>
              {text.length > 420 && <span className="text-[11px] text-danger">Limit approaching</span>}
            </div>
          </div>

          {/* Follow-up date */}
          {showFollowup && (
            <div>
              <label className="label mb-1 block">Follow-up Date</label>
              <input
                type="date"
                className="input w-full"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary !bg-gradient-to-br !from-navy !to-navy-light"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving…" : "✓ Save Remarks"}
          </button>
        </div>
      </div>
    </div>
  );
}
