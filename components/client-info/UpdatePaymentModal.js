"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { postJson } from "@/lib/clientFetch";
import { ciDate, ciInr, ciSafe } from "./helpers";

const PAYMENT_MODES = ["CG-Billzy", "UPI-Bank Transfer", "UPI", "IMPS/NEFT", "PayU", "Paytm"];
const GLOBAL_STATUSES = ["Part Payment", "Settelment", "Closed"];

function Ro({ label, value }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input bg-surface" value={value} readOnly />
    </div>
  );
}

/**
 * Update Payment modal — port of the repayModal + ciSubmitCollection().
 * On success the page is reloaded via location.replace (same as PHP) so
 * fresh API data is shown. Submit button hidden when the loan is closed.
 * redirectTo lets each caller (client-info vs customer-one-pager) send the
 * user back to its own route instead of a hardcoded page.
 */
export default function UpdatePaymentModal({ open, onClose, loan, leadId, isClosed, redirectTo = "/client-info" }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: "", date: "", waiver: "", utr: "", mode: "", status: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: "", date: "", waiver: "", utr: "", mode: "", status: "" });
  }, [open]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /* ── SUBMIT COLLECTION — verbatim payload & flow from ciSubmitCollection() ── */
  async function submit() {
    const data = {
      loan_no: loan.loan_no ?? "",
      amount_recovered: form.amount,
      recovery_date: form.date,
      waiver: form.waiver,
      utr: form.utr,
      payment_method: form.mode,
      Payment_mode: form.mode,
      globalStatus: form.status,
    };
    if (!data.amount_recovered || !data.recovery_date || !data.payment_method || !data.globalStatus) {
      return toast.error("Please fill all required fields.");
    }
    setBusy(true);
    const res = await postJson("/api/payments/post-payment", data);
    if (res.status === 0) {
      setBusy(false);
      return toast.error("Network error — please try again.");
    }
    if (res.data?.success) {
      setBusy(false); // hide the full-screen overlay so the toast below is actually visible
      toast.success(res.data.message || "Payment updated successfully!");
      /* Redirect → page reloads with fresh API data. location.replace so
         the Back button doesn't re-trigger — same as the PHP page. Delay
         gives the toast time to actually render before navigation. */
      setTimeout(() => {
        window.location.replace(`${redirectTo}?lead_id=${encodeURIComponent(leadId)}`);
      }, 1200);
    } else {
      setBusy(false);
      toast.error(res.data?.message || "Payment update failed. Please try again.");
    }
  }

  return (
    <>
      {/* Global loader overlay — shown while Update Payment is in-flight */}
      {busy && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3.5 bg-white/70 backdrop-blur-sm">
          <span className="inline-block h-[52px] w-[52px] animate-spin rounded-full border-4 border-accent-light border-t-accent" />
          <div className="text-sm font-semibold text-gray-600">Updating payment…</div>
        </div>
      )}

      <Modal
        open={open}
        onClose={onClose}
        title="Update Payment"
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {!isClosed && (
              <button
                className="btn bg-[#1E7E5E] text-white hover:bg-[#165f47]"
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit Payment"}
              </button>
            )}
          </>
        }
      >
        <div className="mb-3.5 rounded-xl border border-line bg-surface p-4">
          <h4 className="mb-3 border-b border-line pb-2 font-display text-sm text-gray-800">Loan Information</h4>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Ro label="Loan ID" value={ciSafe(loan.loan_no)} />
            <Ro label="Applicant Name" value={ciSafe(loan.full_name)} />
            <Ro label="Sanction Amount" value={ciInr(loan.loan_amount ?? 0)} />
            <Ro label="Sanction Date" value={ciDate(loan.sanction_date)} />
            <Ro label="Repayment Amount" value={ciInr(loan.repayment_amount ?? 0)} />
            <Ro label="Repayment Date" value={ciDate(loan.repayment_date)} />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h4 className="mb-3 border-b border-line pb-2 font-display text-sm text-gray-800">Collection Entry</h4>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Ro label="Preclosure Amount" value={ciInr(loan.preclouser_amount ?? 0)} />
            <Ro label="Previous Collection" value={ciInr(loan.collection_amount ?? 0)} />
            <Ro label="Prev Collection Date" value={ciDate(loan.collection_date)} />
            <Ro label="Overdue Days" value={ciSafe(loan.dpd ?? "")} />
            <Ro label="Overdue Amount" value={ciSafe(loan.penalty_charges ?? "0")} />
            <Ro label="Outstanding Amount" value={ciSafe(loan.ontime_repayment_amount ?? "0")} />
            <div>
              <label className="label">Recovered Amount *</label>
              <input
                className="input"
                type="number"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Collection Date *</label>
              <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label className="label">Wave-Off (Waiver)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.waiver}
                onChange={(e) => set("waiver", e.target.value)}
              />
            </div>
            <div>
              <label className="label">UTR Number</label>
              <input className="input" placeholder="Enter UTR" value={form.utr} onChange={(e) => set("utr", e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Mode *</label>
              <select className="input" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                <option value="">— Select Mode —</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Global Status *</label>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="">— Select Status —</option>
                {GLOBAL_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
