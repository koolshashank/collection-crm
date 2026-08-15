"use client";

import styles from "./settlement.module.css";
import { fmtInr, fmtDate, fmtDateTime, STATUS_PILL_CLASS, STATUS_LABEL } from "./settlementUtils";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function Row({ label, value }) {
  return (
    <div className={styles.micRow}>
      <span className={styles.micLabel}>{label}</span>
      <span className={styles.micVal}>{value ?? "—"}</span>
    </div>
  );
}

export default function DetailModal({ open, row, onClose }) {
  if (!open || !row) return null;

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 500 }}>
        <div className={`${styles.modalHead} ${styles.modalHeadSettle}`}>
          <div className={`${styles.modalTitle} ${styles.modalTitleLight}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            Request Details
          </div>
          <button type="button" className={`${styles.modalClose} ${styles.modalCloseLight}`} onClick={onClose}>
            {CLOSE_ICON}
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalInfoCard}>
            <Row label="Borrower" value={row.borrowerName} />
            <Row label="Loan No" value={row.loanNo} />
            <Row label="Mobile" value={row.mobile} />
            <Row label="Loan Amount" value={fmtInr(row.loanAmt)} />
            <Row label="Outstanding" value={fmtInr(row.outstanding)} />
            <Row label="Settlement Amt" value={fmtInr(row.settleAmt)} />
            <Row label="Waiver" value={fmtInr(row.waiver)} />
            <Row label="DPD" value={row.dpd} />
            <Row label="Settlement Type" value={row.settleType} />
            <Row label="Settlement Date" value={fmtDate(row.settleDate)} />
            <Row label="Status" value={<span className={`${styles.pill} ${styles[STATUS_PILL_CLASS[row.status]]}`}>{STATUS_LABEL[row.status]}</span>} />
          </div>

          <div style={{ fontSize: ".78rem", color: "var(--text-mid)", marginBottom: 10 }}>
            <strong style={{ color: "var(--text-dark)" }}>Reason:</strong> {row.reason || "—"}
          </div>
          {row.notes && (
            <div style={{ fontSize: ".78rem", color: "var(--text-mid)", marginBottom: 10 }}>
              <strong style={{ color: "var(--text-dark)" }}>Notes:</strong> {row.notes}
            </div>
          )}
          {row.adminRemarks && (
            <div style={{ fontSize: ".78rem", color: "var(--text-mid)", marginBottom: 10 }}>
              <strong style={{ color: "var(--text-dark)" }}>Admin Remarks:</strong> {row.adminRemarks}
            </div>
          )}

          <div style={{ fontSize: ".71rem", color: "var(--text-soft)" }}>
            Raised by {row.raisedBy} · {fmtDateTime(row.raisedOn)}
            {row.decidedOn && (
              <>
                <br />
                Decided by {row.decidedBy} · {fmtDateTime(row.decidedOn)}
              </>
            )}
            {row.letterSent && (
              <>
                <br />
                Letter sent to {row.letterSentTo} · {fmtDateTime(row.letterSentOn)}
              </>
            )}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
