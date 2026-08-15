"use client";

import { useState, useEffect } from "react";
import styles from "./settlement.module.css";
import { fmtInr, fmtDate } from "./settlementUtils";
import Timeline from "./Timeline";
import { decideSettlement } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ApproveRejectModal({ open, row, onClose, onDecided, currentUser }) {
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, row]);

  if (!open || !row) return null;

  const decide = async (decision) => {
    if (!remarks.trim()) {
      toast.warning("Admin decision remarks are required.");
      return;
    }
    setBusy(decision);
    const res = await decideSettlement(row.id, decision, remarks, currentUser?.name || "Admin");
    setBusy(null);
    if (res.success) {
      toast.success(decision === "approved" ? "Settlement approved." : "Settlement rejected.");
      onDecided(res.row);
      onClose();
    } else {
      toast.error(res.message || "Could not record decision.");
    }
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 500 }}>
        <div className={`${styles.modalHead} ${styles.modalHeadSettle}`}>
          <div className={`${styles.modalTitle} ${styles.modalTitleLight}`}>Review Request — {row.loanNo}</div>
          <button type="button" className={`${styles.modalClose} ${styles.modalCloseLight}`} onClick={onClose}>
            {CLOSE_ICON}
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalInfoCard}>
            <div className={styles.micRow}><span className={styles.micLabel}>Borrower</span><span className={styles.micVal}>{row.borrowerName}</span></div>
            <div className={styles.micRow}><span className={styles.micLabel}>Outstanding</span><span className={styles.micVal}>{fmtInr(row.outstanding)}</span></div>
            <div className={styles.micRow}><span className={styles.micLabel}>Settlement Amt</span><span className={styles.micVal}>{fmtInr(row.settleAmt)}</span></div>
            <div className={styles.micRow}><span className={styles.micLabel}>Waiver</span><span className={styles.micVal}>{fmtInr(row.waiver)}</span></div>
            <div className={styles.micRow}><span className={styles.micLabel}>Settlement Date</span><span className={styles.micVal}>{fmtDate(row.settleDate)}</span></div>
            <div className={styles.micRow}><span className={styles.micLabel}>Raised By</span><span className={styles.micVal}>{row.raisedBy}</span></div>
          </div>

          <div style={{ fontSize: ".69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-soft)", marginBottom: 8 }}>
            Request Timeline
          </div>
          <Timeline row={row} />

          <div style={{ marginTop: 16 }}>
            <div className={styles.fieldLabel}>Admin Decision Remarks <span className={styles.req}>*</span></div>
            <textarea
              className={styles.fieldTextarea}
              style={{ minHeight: 80 }}
              placeholder="State your reason for approving or rejecting this settlement request…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => decide("rejected")} disabled={!!busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Reject
            {busy === "rejected" && <span className={styles.spinnerBtn} />}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} onClick={() => decide("approved")} disabled={!!busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Approve
            {busy === "approved" && <span className={styles.spinnerBtn} />}
          </button>
        </div>
      </div>
    </div>
  );
}
