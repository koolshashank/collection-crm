"use client";

import { useEffect, useState } from "react";
import styles from "./settlementApproval.module.css";
import { fmtInr } from "@/components/settlement/settlementUtils";
import { decideSettlement } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function DecideModal({ open, row, decision, onClose, onDecided, currentUser }) {
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, row]);

  if (!open || !row) return null;

  const isApprove = decision === "approved";

  const submit = async () => {
    if (!isApprove && !remarks.trim()) {
      toast.warning("Please enter rejection remarks.");
      return;
    }
    setSaving(true);
    const res = await decideSettlement(row.id, decision, remarks, currentUser?.name || "Admin");
    setSaving(false);
    if (res.success) {
      toast.success(isApprove ? "Settlement approved!" : "Settlement rejected.");
      onDecided(res.row);
      onClose();
    } else {
      toast.error(res.message || "Action failed. Please try again.");
    }
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 480 }}>
        <div className={`${styles.modalHead} ${isApprove ? styles.modalHeadApprove : styles.modalHeadReject}`}>
          <div className={styles.modalHeadTitle}>
            {isApprove ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            )}
            {isApprove ? "Approve Settlement" : "Reject Settlement"}
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>{CLOSE_ICON}</button>
        </div>

        <div className={styles.modalBody}>
          <div className={`${styles.confirmBox} ${isApprove ? styles.confirmApprove : styles.confirmReject}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isApprove ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              )}
            </svg>
            <div>
              <strong>
                {isApprove ? "Approving settlement for " : "Rejecting settlement request for "}
                {row.borrowerName} — Loan {row.loanNo}
              </strong>
              <p>
                {isApprove
                  ? `Settlement amount: ${fmtInr(row.settleAmt)}  |  Waiver: ${fmtInr(row.waiver)}. This action will be recorded.`
                  : "The request will be marked as rejected. The employee will be notified via collection logs."}
              </p>
            </div>
          </div>

          <label className={styles.fieldLabel}>
            Admin Remarks {!isApprove && <span style={{ color: "var(--error)" }}>*</span>}
          </label>
          <textarea
            className={styles.textarea}
            placeholder="Enter your remarks…"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className={styles.modalFoot}>
          <button type="button" className={styles.plainBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            style={{
              padding: "9px 20px", border: "none", borderRadius: 9, fontFamily: "'DM Sans', sans-serif",
              fontSize: ".82rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", color: "#fff",
              background: isApprove ? "#166534" : "var(--error)", opacity: saving ? .7 : 1,
            }}
          >
            {saving ? "Saving…" : isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
