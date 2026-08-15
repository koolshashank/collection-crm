"use client";

import { useEffect, useState } from "react";
import { postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

const TYPES = [
  { value: "full", title: "Full", sub: "Total pending" },
  { value: "partial", title: "Partial", sub: "Custom amount" },
  { value: "settle", title: "Settle", sub: "Settlement offer" },
];

export default function PtpModal({ lead, onClose }) {
  const toast = useToast();
  const pending = parseFloat(lead.pendingAmt) || 0;

  const [type, setType] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [hint, setHint] = useState({ text: "", tone: "text-gray-400" });
  const [showPendingBadge, setShowPendingBadge] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* lpPtpTypeChange — identical hints/behaviour */
  const onTypeChange = (t) => {
    setType(t);
    if (t === "full") {
      setAmount(pending > 0 ? String(pending) : "");
      setHint({
        text: pending > 0 ? "Auto-filled from outstanding amount" : "Pending amount not available — enter manually",
        tone: "text-accent-dark",
      });
      setShowPendingBadge(pending > 0);
    } else if (t === "partial") {
      setAmount("");
      setHint({
        text: pending > 0
          ? "Enter partial amount (outstanding: " + pending.toLocaleString("en-IN") + ")"
          : "Enter the partial amount customer will pay",
        tone: "text-gray-400",
      });
      setShowPendingBadge(false);
    } else if (t === "settle") {
      setAmount("");
      setHint({
        text: pending > 0
          ? "Enter settlement offer (outstanding: " + pending.toLocaleString("en-IN") + ")"
          : "Enter the settlement amount offered",
        tone: "text-amber",
      });
      setShowPendingBadge(false);
    }
  };

  /* lpSubmitPTP — identical validation & payload */
  const submit = async () => {
    if (!type) return toast.error("Please select Full, Partial or Settle");
    if (!date) return toast.error("Please select a PTP date");
    if (!amount || parseFloat(amount) <= 0) return toast.error("Please enter a valid amount");
    if (!remarks.trim()) return toast.error("Please enter remarks");

    setSaving(true);
    const res = await postJson("/api/ptp/submit", {
      lead_id: lead.leadId,
      loan_id: lead.loanId,
      ptp_date: date,
      ptp_amount: parseFloat(amount),
      ptp_type: type,
      pending_amount: pending,
      remarks: remarks.trim(),
      action_taken:
        type === "full" ? "Full payment committed"
        : type === "partial" ? "Partial payment committed"
        : "Settlement offer",
      action_required: "Follow up on agreed date",
    });
    setSaving(false);
    if (res.status === 0) return toast.error("Network error — please try again");
    if (res.data?.success) {
      toast.success("PTP saved for " + lead.name);
      onClose();
    } else {
      toast.error(res.data?.message || "Failed to save PTP");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-accent-dark to-accent px-5 py-4">
          <div>
            <p className="font-display text-base text-white">Promise to Pay</p>
            <p className="mt-0.5 text-xs text-white/80">
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

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* PTP Date */}
          <div>
            <label className="label mb-1 block">PTP Date <span className="text-danger">*</span></label>
            <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Payment Type */}
          <div>
            <label className="label mb-2 block">Payment Type <span className="text-danger">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                    type === t.value ? "border-accent bg-accent-light" : "border-line bg-surface hover:border-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="lpPtpType"
                    value={t.value}
                    checked={type === t.value}
                    onChange={() => onTypeChange(t.value)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-800">{t.title}</span>
                    <span className="block text-[10px] text-gray-400">{t.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="label mb-1 flex items-center justify-between">
              <span>PTP Amount <span className="text-danger">*</span></span>
              {showPendingBadge && (
                <span className="badge bg-accent-light text-accent-dark">
                  Pending: {pending.toLocaleString("en-IN")}
                </span>
              )}
            </label>
            <input
              type="number"
              className={`input w-full ${type === "full" ? "text-gray-500" : ""}`}
              placeholder="Enter amount"
              value={amount}
              readOnly={type === "full"}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={type === "partial" || type === "settle"}
            />
            <p className={`mt-1 min-h-[14px] text-[11px] ${hint.tone}`}>{hint.text}</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="label mb-1 block">Remarks <span className="text-danger">*</span></label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Customer confirmed payment on this date"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "✓ Submit PTP"}
          </button>
        </div>
      </div>
    </div>
  );
}
