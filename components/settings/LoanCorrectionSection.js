"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { clientFetch } from "@/lib/clientFetch";

/**
 * Loan Correction card — mirror of the settings.php loan correction flow.
 * Backed by /api/settings/loan-correction (proxy for loan_correction_proxy.php):
 *   1. Enter loan no + Fetch
 *   2. Info card: CLOSED/RECOVERED/SETTLED → Reopen button; otherwise txns show
 *   3. Reopen → modal → confirm → transactions load
 *   4. Select transaction → enter reason → delete
 */
const API = "/api/settings/loan-correction";

function isClosedStatus(st) {
  const s = String(st || "").toUpperCase();
  return (
    s.includes("RECOVER") || s.includes("CLOSE") || s.includes("SETTL") || s.includes("NOC") || s.includes("PAID")
  );
}

const inr = (v) => (v && Number(v) > 0 ? "Rs." + Number(v).toLocaleString("en-IN") : "-");
const dt = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const txnId = (t, i) => String(t.payment_id ?? t.id ?? t.txn_id ?? i);

export default function LoanCorrectionSection() {
  const { success, error: toastError } = useToast();
  const [loanInput, setLoanInput] = useState("");
  const [hint, setHint] = useState({ text: "Enter loan number and click Fetch", tone: "" });
  const [fetching, setFetching] = useState(false);
  const [loan, setLoan] = useState(null);
  const [loanNo, setLoanNo] = useState("");
  const [closed, setClosed] = useState(false);
  const [statusOverride, setStatusOverride] = useState(null);
  const [txns, setTxns] = useState([]);
  const [showTxns, setShowTxns] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const [selId, setSelId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  /* STEP 1 — Fetch */
  async function fetchLoan() {
    const val = loanInput.trim().toUpperCase();
    if (!val) {
      setHint({ text: "Please enter a loan number", tone: "err" });
      return;
    }
    setFetching(true);
    setHint({ text: "Fetching...", tone: "" });

    const res = await clientFetch(`${API}?loan_no=${encodeURIComponent(val)}`);
    setFetching(false);

    const data = res.data && typeof res.data === "object" ? res.data : null;
    if (!data) {
      setHint({ text: "Server error - please try again", tone: "err" });
      return;
    }
    if (!data.success) {
      setHint({ text: data.message || "Loan not found", tone: "err" });
      return;
    }

    const l = data.loan || data.loan_details || data.data || {};
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const st = l.loan_status || l.payment_status || l.status || "";
    const isClosed = isClosedStatus(st);

    setLoan(l);
    setLoanNo(val);
    setTxns(payments);
    setClosed(isClosed);
    setStatusOverride(null);
    setSelId(null);
    setDeleteReason("");

    if (!isClosed) {
      setShowTxns(true);
      setHint({ text: `Loan found - ${l.full_name || val} (${payments.length} transactions)`, tone: "ok" });
    } else {
      setShowTxns(false);
      setHint({ text: `Loan found - ${l.full_name || val}. Click Reopen Case to view transactions.`, tone: "ok" });
    }
  }

  /* STEP 3 — Reopen */
  async function submitReopen() {
    const reason = reopenReason.trim();
    if (!reason) {
      toastError("Please enter a reason for reopening");
      return;
    }
    if (!loanNo) {
      toastError("No loan loaded");
      return;
    }
    setReopening(true);
    const res = await clientFetch(`${API}?loan_no=${encodeURIComponent(loanNo)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan_no: loanNo, action: "reopen_only", confirm_reopen: true, reason }),
    });
    setReopening(false);

    const d = res.data && typeof res.data === "object" ? res.data : {};
    const ok =
      d.success || d.status === "success" || (typeof d.message === "string" && d.message.toLowerCase().includes("reopen"));

    if (ok) {
      success("Loan reopened - select a transaction below to delete");
      setReopenOpen(false);
      setStatusOverride("Not Recovered");
      setClosed(false);
      loadTxns();
    } else {
      toastError(d.message || d.error || "Reopen failed");
    }
  }

  /* STEP 4 — Load transactions */
  async function loadTxns() {
    if (!loanNo) return;
    setShowTxns(true);
    setTxnLoading(true);
    const res = await clientFetch(`${API}?loan_no=${encodeURIComponent(loanNo)}`);
    setTxnLoading(false);
    const d = res.data && typeof res.data === "object" ? res.data : {};
    const list = d.payments || d.transactions || [];
    const arr = Array.isArray(list) ? list : [];
    setTxns(arr);
    setSelId(null);
    setHint({ text: `${arr.length} transaction(s) - select one to delete`, tone: "ok" });
  }

  /* Delete transaction */
  async function deleteTxn() {
    if (!selId) return toastError("No transaction selected");
    if (!loanNo) return toastError("No loan loaded");
    const reason = deleteReason.trim();
    if (!reason) return toastError("Please enter a reason for deletion");
    if (!window.confirm(`Delete transaction #${selId}? This cannot be undone.`)) return;

    setDeleting(true);
    const res = await clientFetch(`${API}?loan_no=${encodeURIComponent(loanNo)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan_no: loanNo, payment_id: selId, action: "delete", reason }),
    });
    setDeleting(false);

    const d = res.data && typeof res.data === "object" ? res.data : {};
    const ok =
      d.success || d.status === "success" || (typeof d.message === "string" && d.message.toLowerCase().includes("delet"));

    if (ok) {
      success(`Transaction #${selId} deleted`);
      setTxns((list) => list.filter((t, i) => txnId(t, i) !== String(selId)));
      setSelId(null);
      setDeleteReason("");
    } else {
      toastError(d.message || d.error || "Delete failed");
    }
  }

  const selectedTxn = txns.find((t, i) => txnId(t, i) === String(selId));
  const rawStatus = statusOverride || loan?.loan_status || loan?.payment_status || loan?.status || "Unknown";

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">✎</span>
            Loan Correction
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Reopen a closed loan or delete an incorrect payment transaction</div>
        </div>
        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-danger">
          Sensitive Action
        </span>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber/10 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-amber">⚠</span>
          <span>
            All corrections are <strong>logged with your name, timestamp, and reason</strong>. Use with caution.
          </span>
        </div>

        {/* Loan lookup */}
        <div className="mb-4">
          <label className="label">Loan Number</label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                className="input w-full uppercase tracking-wide"
                placeholder="e.g. BLKR00021946"
                value={loanInput}
                onChange={(e) => setLoanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLoan()}
              />
              <div
                className={`mt-1 min-h-4 text-xs ${
                  hint.tone === "ok" ? "text-emerald-700" : hint.tone === "err" ? "text-danger" : "text-gray-400"
                }`}
              >
                {hint.text}
              </div>
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={fetchLoan} disabled={fetching}>
              {fetching ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="border-white border-t-transparent" /> Fetch
                </span>
              ) : (
                "Fetch"
              )}
            </button>
          </div>
        </div>

        {/* Loan result card */}
        {loan && (
          <div className="mb-4 rounded-xl border border-line bg-surface p-4">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <div className="font-display text-base font-bold text-gray-800">
                  {loan.full_name || loan.customer_name || loan.borrower_name || "-"}
                </div>
                <div className="mt-0.5 text-xs text-gray-400">
                  Loan: {loan.loan_no || loan.loan_id || "-"} &nbsp; Lead: {loan.lead_id || "-"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    closed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-danger"
                  }`}
                >
                  {rawStatus}
                </span>
                {closed && (
                  <button
                    type="button"
                    onClick={() => {
                      setReopenReason("");
                      setReopenOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                  >
                    Reopen Case
                  </button>
                )}
              </div>
            </div>

            {/* Info tiles */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Loan Amount", inr(loan.loan_amount || loan.sanction_amount)],
                ["Repayment Amt", inr(loan.repayment_amount)],
                ["Collected Amt", inr(loan.collection_amount || loan.collected_amount)],
                ["Collection Date", dt(loan.collection_date || loan.payment_date)],
                ["Overdue Days", `${loan.overdue_days || loan.dpd || "-"} days`],
                ["Penalty Amount", inr(loan.penalty_amount || loan.late_fee)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-white px-3 py-2.5">
                  <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
                  <div className="text-sm font-semibold text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions panel */}
        {loan && showTxns && (
          <div>
            <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-gray-800">
              Payment Transactions
              <span className="text-xs font-normal text-gray-400">
                ({txns.length} transaction{txns.length !== 1 ? "s" : ""})
              </span>
            </div>

            {txnLoading ? (
              <div className="py-6 text-center">
                <Spinner size={28} className="mx-auto" />
                <div className="mt-2 text-xs text-gray-400">Loading transactions...</div>
              </div>
            ) : txns.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface px-4 py-7 text-center text-xs text-gray-400">
                No payment transactions found for this loan.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface">
                        <th className="th w-10 text-center">Select</th>
                        <th className="th">ID</th>
                        <th className="th">Date</th>
                        <th className="th">Amount</th>
                        <th className="th">Mode</th>
                        <th className="th">Ref / Txn ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t, i) => {
                        const pid = txnId(t, i);
                        const isSel = String(selId) === pid;
                        return (
                          <tr
                            key={pid}
                            className={`border-b border-line last:border-0 hover:bg-accent-light/20 ${
                              isSel ? "bg-red-50/70" : ""
                            }`}
                          >
                            <td className="td text-center">
                              <input
                                type="radio"
                                name="lcTxnSel"
                                value={pid}
                                checked={isSel}
                                onChange={() => {
                                  setSelId(pid);
                                  setDeleteReason("");
                                }}
                                className="h-4 w-4 cursor-pointer accent-danger"
                              />
                            </td>
                            <td className="td font-semibold text-accent-dark">#{pid}</td>
                            <td className="td whitespace-nowrap text-gray-400">
                              {dt(t.collection_date || t.payment_date || t.created_at)}
                            </td>
                            <td className="td font-bold text-emerald-700">{inr(t.received_amount || t.amount)}</td>
                            <td className="td text-gray-400">{t.payment_method || t.payment_mode || "-"}</td>
                            <td className="td text-xs text-gray-600">{t.reference_no || t.txn_id || t.transaction_id || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Delete bar */}
                {selId !== null && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-4 py-3.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-danger">
                      ⚠{" "}
                      <span>
                        {selectedTxn
                          ? `Payment #${selId}  |  Rs.${Number(
                              selectedTxn.received_amount || selectedTxn.amount || 0
                            ).toLocaleString("en-IN")}  |  ${selectedTxn.payment_method || selectedTxn.payment_mode || ""}  |  ${
                              selectedTxn.collection_date
                                ? new Date(selectedTxn.collection_date).toLocaleDateString("en-IN")
                                : ""
                            }`
                          : `Transaction #${selId} selected`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="text"
                        placeholder="Reason for deletion (required)"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className="input min-w-[220px] border-red-200 bg-white"
                      />
                      <button type="button" className="btn-danger" onClick={deleteTxn} disabled={deleting}>
                        {deleting ? (
                          <span className="flex items-center gap-2">
                            <Spinner size={13} className="border-white border-t-transparent" /> Deleting…
                          </span>
                        ) : (
                          "Delete Transaction"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reopen modal */}
      <Modal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title="Reopen Loan Case"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReopenOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReopen}
              disabled={reopening}
              className="inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {reopening ? (
                <>
                  <Spinner size={13} className="border-white border-t-transparent" /> Reopening...
                </>
              ) : (
                "Confirm Reopen"
              )}
            </button>
          </>
        }
      >
        <div className="mb-3 text-xs text-gray-500">
          {(loan?.full_name || loan?.customer_name || "") + "  " + (loan?.loan_no || loan?.loan_id || loanNo)}
        </div>
        <div className="mb-3.5 rounded-lg border border-amber/40 bg-amber/10 px-3.5 py-3 text-xs text-amber">
          Reopening will set the loan status back to <strong>Active / Not Recovered</strong>. This is logged with your
          name and timestamp.
        </div>
        <label className="label">
          Reason for Reopening <span className="text-danger">*</span>
        </label>
        <textarea
          className="input min-h-[76px] w-full resize-y leading-relaxed"
          placeholder="e.g. Customer dispute, incorrect closure..."
          value={reopenReason}
          onChange={(e) => setReopenReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
