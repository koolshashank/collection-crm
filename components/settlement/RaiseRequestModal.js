"use client";

import { useEffect, useState } from "react";
import styles from "./settlement.module.css";
import { fmtInr, initials } from "./settlementUtils";
import { lookupLoanForSettlement, raiseSettlementRequest } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";
import { clientFetch } from "@/lib/clientFetch";
import { getSettlementSuggestion } from "@/lib/settlementVintage";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const initialForm = {
  settleAmt: "",
  waiver: "",
  settleDate: "",
  settleType: "OTS",
  reason: "",
  notes: "",
};

export default function RaiseRequestModal({ open, onClose, onCreated, currentUser }) {
  const toast = useToast();
  const [loanInput, setLoanInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [hint, setHint] = useState("Enter loan number to auto-fill borrower details");
  const [loan, setLoan] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [vintagePolicy, setVintagePolicy] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    clientFetch("/api/config/settlement-vintage").then((res) => {
      if (!cancelled && res.ok && res.data?.success) setVintagePolicy(res.data.config);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const suggestion = loan ? getSettlementSuggestion(vintagePolicy, loan.dpd, loan.outstanding) : null;

  const reset = () => {
    setLoanInput("");
    setLoan(null);
    setForm(initialForm);
    setHint("Enter loan number to auto-fill borrower details");
  };

  const close = () => {
    reset();
    onClose();
  };

  const doLookup = async () => {
    if (!loanInput.trim()) {
      setHint("Enter a loan number first.");
      return;
    }
    setLooking(true);
    setHint("Looking up loan…");
    const res = await lookupLoanForSettlement(loanInput);
    setLooking(false);
    if (!res.success) {
      setHint(res.message || "Loan not found.");
      setLoan(null);
      return;
    }
    setLoan(res.loan);
    setHint("Loan details loaded — fill in the settlement terms below.");
    setForm((f) => ({ ...f, waiver: "", settleAmt: "" }));
  };

  const updateCalc = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (loan) {
        const settleAmt = parseFloat(field === "settleAmt" ? value : next.settleAmt) || 0;
        const waiver = field === "waiver" ? parseFloat(value) || 0 : Math.max(0, loan.outstanding - settleAmt);
        if (field === "settleAmt") next.waiver = waiver ? String(waiver) : "";
      }
      return next;
    });
  };

  const waiverVal = loan ? Math.max(0, loan.outstanding - (parseFloat(form.settleAmt) || 0)) : 0;

  const canSubmit =
    loan && form.settleAmt && Number(form.settleAmt) > 0 && form.settleDate && form.reason.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const res = await raiseSettlementRequest({
      loanNo: loan.loanNo,
      leadId: loan.leadId,
      borrowerName: loan.borrowerName,
      mobile: loan.mobile,
      email: loan.email,
      pan: loan.pan,
      loanAmt: loan.loanAmt,
      outstanding: loan.outstanding,
      settleAmt: Number(form.settleAmt),
      waiver: waiverVal,
      dpd: loan.dpd,
      settleType: form.settleType,
      settleDate: form.settleDate,
      reason: form.reason,
      notes: form.notes,
      raisedBy: currentUser?.name || "You",
      raisedByEmpId: currentUser?.id || "",
    });
    setSubmitting(false);
    if (res.success) {
      toast.success("Settlement request submitted to admin.");
      onCreated(res.row);
      close();
    } else {
      toast.error(res.message || "Could not submit request.");
    }
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={styles.modalBox} style={{ maxWidth: 600 }}>
        <div className={`${styles.modalHead} ${styles.modalHeadSettle}`}>
          <div className={`${styles.modalTitle} ${styles.modalTitleLight}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M7 8h10M7 12h6" />
            </svg>
            Raise Settlement Request
          </div>
          <button type="button" className={`${styles.modalClose} ${styles.modalCloseLight}`} onClick={close}>
            {CLOSE_ICON}
          </button>
        </div>

        <div className={styles.modalBody}>
          <div style={{ marginBottom: 14 }}>
            <div className={styles.fieldLabel}>
              Loan ID / Loan Number <span className={styles.req}>*</span>
            </div>
            <div className={styles.lookupRow}>
              <input
                className={styles.fieldInput}
                type="text"
                placeholder="e.g. BLKR00021946"
                value={loanInput}
                onChange={(e) => {
                  setLoanInput(e.target.value);
                  setLoan(null);
                }}
              />
              <button type="button" className={`${styles.btn} ${styles.btnSettle}`} onClick={doLookup} disabled={looking}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Fetch
                {looking && <span className={styles.spinnerBtn} />}
              </button>
            </div>
            <div className={`${styles.fieldHint} ${loan ? styles.fieldHintOk : ""}`}>{hint}</div>
          </div>

          {loan && (
            <>
              <div className={styles.lookupResult}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: 10, background: "var(--accent-dark)", color: "#fff",
                      fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    {initials(loan.borrowerName)}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--accent-dark)" }}>
                      {loan.borrowerName}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                      <span className={`${styles.pill} ${styles.pillSettle}`}>{loan.loanNo}</span>
                      <span className={`${styles.pill} ${styles.pillRejected}`}>{loan.status}</span>
                      {loan.isReloan && <span className={`${styles.pill} ${styles.pillApproved}`}>Reloan</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                  <div className={styles.lrTop}>
                    <div className={styles.lrTopLabel}>Loan Amount</div>
                    <div className={styles.lrTopVal}>{fmtInr(loan.loanAmt)}</div>
                  </div>
                  <div className={styles.lrTop}>
                    <div className={styles.lrTopLabel}>Outstanding</div>
                    <div className={styles.lrTopVal} style={{ color: "var(--error)" }}>{fmtInr(loan.outstanding)}</div>
                  </div>
                  <div className={styles.lrTop}>
                    <div className={styles.lrTopLabel}>Repayment Amt</div>
                    <div className={styles.lrTopVal} style={{ color: "var(--warning)" }}>{fmtInr(loan.repayAmt)}</div>
                  </div>
                  <div className={styles.lrTop}>
                    <div className={styles.lrTopLabel}>DPD</div>
                    <div className={styles.lrTopVal} style={{ color: "var(--error)" }}>{loan.dpd}</div>
                  </div>
                </div>

                {suggestion && (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                      background: "var(--info-light)", border: "1px solid var(--info-border)", borderRadius: 8,
                      padding: "9px 12px", marginBottom: 10, fontSize: ".78rem", color: "var(--text-dark)",
                    }}
                  >
                    <span style={{ color: "var(--info)", fontWeight: 700 }}>ⓘ Suggested (vintage policy):</span>
                    <span>
                      {suggestion.bucketLabel} → <strong>{suggestion.percent}%</strong> of outstanding ={" "}
                      <strong style={{ color: "var(--info)" }}>{fmtInr(suggestion.amount)}</strong>
                    </span>
                    <span style={{ color: "var(--text-soft)", fontStyle: "italic" }}>— reference only, does not auto-fill the form</span>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Mobile</div><div className={styles.lrVal}>{loan.mobile || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Alt Mobile</div><div className={styles.lrVal}>{loan.altMobile || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>PAN</div><div className={styles.lrVal} style={{ fontFamily: "monospace" }}>{loan.pan || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Email</div><div className={styles.lrVal} style={{ fontSize: ".71rem", wordBreak: "break-all" }}>{loan.email || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Repayment Date</div><div className={styles.lrVal}>{loan.repayDate || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Sanction Date</div><div className={styles.lrVal}>{loan.sanctionDate || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Penalty</div><div className={styles.lrVal}>{fmtInr(loan.penalty)}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Loan Type</div><div className={styles.lrVal}>{loan.loanType || "—"}</div></div>
                  <div className={styles.lrTile}><div className={styles.lrLbl}>Tenure</div><div className={styles.lrVal}>{loan.tenure || "—"}</div></div>
                </div>
              </div>

              <div className={styles.raiseGrid}>
                <div>
                  <div className={styles.fieldLabel}>Settlement Amount (₹) <span className={styles.req}>*</span></div>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    placeholder="0.00"
                    value={form.settleAmt}
                    onChange={(e) => updateCalc("settleAmt", e.target.value)}
                  />
                  <div className={styles.fieldHint}>Amount customer agrees to pay</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Waiver / Concession (₹)</div>
                  <input className={styles.fieldInput} type="number" value={form.settleAmt ? waiverVal : ""} readOnly placeholder="0.00" />
                  <div className={styles.fieldHint}>Auto-calculated from outstanding</div>
                </div>

                <div className={styles.full}>
                  <div className={styles.calcStrip}>
                    <div className={styles.csItem}>
                      <div className={styles.csLabel}>Outstanding</div>
                      <div className={`${styles.csVal} ${styles.csRed}`}>{fmtInr(loan.outstanding)}</div>
                    </div>
                    <div className={styles.csItem}>
                      <div className={styles.csLabel}>Settlement Amt</div>
                      <div className={`${styles.csVal} ${styles.csSettle}`}>{form.settleAmt ? fmtInr(form.settleAmt) : "—"}</div>
                    </div>
                    <div className={styles.csItem}>
                      <div className={styles.csLabel}>Waiver</div>
                      <div className={`${styles.csVal} ${styles.csGreen}`}>{form.settleAmt ? fmtInr(waiverVal) : "—"}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className={styles.fieldLabel}>Settlement Date <span className={styles.req}>*</span></div>
                  <input
                    className={styles.fieldInput}
                    type="date"
                    value={form.settleDate}
                    onChange={(e) => setForm((f) => ({ ...f, settleDate: e.target.value }))}
                  />
                </div>
                <div>
                  <div className={styles.fieldLabel}>Settlement Type</div>
                  <select
                    className={styles.fieldSelect}
                    value={form.settleType}
                    onChange={(e) => setForm((f) => ({ ...f, settleType: e.target.value }))}
                  >
                    <option value="OTS">OTS (One Time Settlement)</option>
                    <option value="Partial">Partial Settlement</option>
                    <option value="Full">Full Settlement</option>
                  </select>
                </div>

                <div className={styles.full}>
                  <div className={styles.fieldLabel}>Reason / Justification <span className={styles.req}>*</span></div>
                  <textarea
                    className={styles.fieldTextarea}
                    placeholder="Explain why this settlement is being proposed. Include customer's hardship, payment history, recovery probability…"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  />
                </div>
                <div className={styles.full}>
                  <div className={styles.fieldLabel}>Additional Notes (for admin)</div>
                  <textarea
                    className={styles.fieldTextarea}
                    style={{ minHeight: 60 }}
                    placeholder="Any supporting context for the admin's decision…"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={close}>
            Cancel
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSettle} ${styles.btnLg}`} onClick={submit} disabled={!canSubmit || submitting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Submit to Admin
            {submitting && <span className={styles.spinnerBtn} />}
          </button>
        </div>
      </div>
    </div>
  );
}
