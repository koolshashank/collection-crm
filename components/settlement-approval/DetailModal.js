"use client";

import { useEffect, useState } from "react";
import styles from "./settlementApproval.module.css";
import { fmtInr, fmtDate, fmtDateTime } from "@/components/settlement/settlementUtils";
import { clientFetch } from "@/lib/clientFetch";
import { getSettlementSuggestion } from "@/lib/settlementVintage";

const ST_CLASS = { pending: styles.stPending, approved: styles.stApproved, rejected: styles.stRejected };
const ST_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function DetRow({ label, value }) {
  return (
    <div className={styles.detItem}>
      <span className={styles.detK}>{label}</span>
      <span className={styles.detV}>{value ?? "—"}</span>
    </div>
  );
}

function dpdColor(dpd) {
  if (dpd > 90) return "var(--error)";
  if (dpd > 30) return "#b45309";
  return "var(--success)";
}

export default function DetailModal({ open, row, onClose, onApprove, onReject, onMarkLetter }) {
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

  if (!open || !row) return null;

  const suggestion = getSettlementSuggestion(vintagePolicy, row.dpd, row.outstanding);

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox}>
        <div className={styles.modalHead}>
          <div className={styles.modalHeadTitle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="14 3 14 9 20 9" /><path d="M9 15l2 2 4-4" />
            </svg>
            Settlement Request <span style={{ opacity: .7, fontSize: ".8rem", fontWeight: 400 }}>#{row.id}</span>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>{CLOSE_ICON}</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detSection}>
            <div className={styles.detHead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              Loan Details
            </div>
            <div className={styles.detGrid}>
              <DetRow label="Loan Number" value={<span className={styles.loan}>{row.loanNo}</span>} />
              <DetRow label="Borrower Name" value={<span style={{ fontWeight: 700 }}>{row.borrowerName}</span>} />
              <DetRow label="Mobile" value={row.mobile} />
              <DetRow label="Email" value={row.email} />
              <DetRow label="PAN" value={row.pan} />
              <DetRow label="DPD" value={<span style={{ fontWeight: 700, color: dpdColor(row.dpd) }}>{row.dpd || 0} days</span>} />
            </div>
          </div>

          <div className={styles.detSection}>
            <div className={styles.detHead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              Settlement Amounts
            </div>
            <div className={styles.detGrid}>
              <DetRow label="Original Loan Amt" value={<span className={styles.detAmt}>{fmtInr(row.loanAmt)}</span>} />
              <DetRow label="Outstanding Amt" value={<span className={`${styles.detAmt} ${styles.detRed}`}>{fmtInr(row.outstanding)}</span>} />
              <DetRow label="Settlement Amount" value={<span className={`${styles.detAmt} ${styles.detGreen}`}>{fmtInr(row.settleAmt)}</span>} />
              <DetRow label="Waiver / Discount" value={<span className={`${styles.detAmt} ${styles.detAmber}`}>{fmtInr(row.waiver)}</span>} />
              <DetRow label="Settlement Type" value={<span className={styles.typeBadge}>{row.settleType || "OTS"}</span>} />
              <DetRow label="Settlement Date" value={fmtDate(row.settleDate)} />
            </div>
            {suggestion && (
              <div
                style={{
                  marginTop: 10, background: "var(--info-light)", border: "1px solid var(--info-border, #b3d9f0)",
                  borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", color: "var(--text-dark)",
                }}
              >
                <span style={{ color: "var(--info)", fontWeight: 700 }}>ⓘ Vintage policy suggestion:</span>{" "}
                {suggestion.bucketLabel} → <strong>{suggestion.percent}%</strong> of outstanding ={" "}
                <strong style={{ color: "var(--info)" }}>{fmtInr(suggestion.amount)}</strong>{" "}
                <span style={{ color: "var(--text-soft)", fontStyle: "italic" }}>(reference only — for review context)</span>
              </div>
            )}
          </div>

          <div className={styles.detSection}>
            <div className={styles.detHead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="14 3 14 9 20 9" /></svg>
              Reason &amp; Notes
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className={styles.detK} style={{ marginBottom: 4 }}>Reason for Settlement</div>
              <div className={styles.textBlock}>{row.reason || "—"}</div>
            </div>
            {row.notes && (
              <div>
                <div className={styles.detK} style={{ marginBottom: 4 }}>Additional Notes</div>
                <div className={styles.textBlock}>{row.notes}</div>
              </div>
            )}
          </div>

          <div className={styles.detSection}>
            <div className={styles.detHead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Request Audit
            </div>
            <div className={styles.detGrid}>
              <DetRow label="Raised By" value={row.raisedBy} />
              <DetRow label="Raised On" value={fmtDateTime(row.raisedOn)} />
              <DetRow label="Status" value={<span className={`${styles.st} ${ST_CLASS[row.status]}`}>{ST_LABEL[row.status]}</span>} />
              <DetRow label="Decided By" value={row.decidedBy || <span style={{ color: "var(--text-soft)", fontStyle: "italic" }}>Pending</span>} />
              <DetRow label="Decided On" value={row.decidedOn ? fmtDateTime(row.decidedOn) : "—"} />
              <DetRow
                label="Letter Sent"
                value={
                  row.letterSent ? (
                    <span style={{ color: "var(--success)", fontWeight: 700 }}>Yes — {fmtDate(row.letterSentOn)}</span>
                  ) : (
                    <span style={{ color: "var(--text-soft)" }}>No</span>
                  )
                }
              />
            </div>
            {row.adminRemarks && (
              <div style={{ gridColumn: "1/-1", marginTop: 8 }}>
                <div className={styles.detK} style={{ marginBottom: 4 }}>Admin Remarks</div>
                <div className={styles.textBlock}>{row.adminRemarks}</div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFoot}>
          {row.status === "pending" && (
            <>
              <button type="button" className={`${styles.actionBtn} ${styles.btnApprove}`} style={{ padding: "9px 16px", fontSize: ".8rem" }} onClick={() => { onClose(); onApprove(row); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Approve
              </button>
              <button type="button" className={`${styles.actionBtn} ${styles.btnReject}`} style={{ padding: "9px 16px", fontSize: ".8rem" }} onClick={() => { onClose(); onReject(row); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Reject
              </button>
            </>
          )}
          {row.status === "approved" && !row.letterSent && (
            <button type="button" className={`${styles.actionBtn} ${styles.btnLetter}`} style={{ padding: "9px 16px", fontSize: ".8rem" }} onClick={() => { onMarkLetter(row); onClose(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              Mark Letter Sent
            </button>
          )}
          <button type="button" className={styles.plainBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
