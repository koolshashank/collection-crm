"use client";

import { useEffect, useState } from "react";
import styles from "./settlement.module.css";
import NdcPreview from "./NdcPreview";
import { sendNdc } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function ndcPayload(row) {
  return {
    loanNo: row.loanNo,
    borrowerName: row.borrowerName,
    pan: row.pan,
    settleDate: row.settleDate,
    settleAmt: row.settleAmt,
    waiver: row.waiver,
  };
}

/**
 * NDC (No Dues Certificate) — issued once a settlement has actually been
 * paid off. Same preview/download/email pattern as LetterModal.js, just
 * for the "after settlement" document instead of the offer.
 */
export default function NdcModal({ open, row, onClose, onSent }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("No Dues Certificate — Settlement Confirmation");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && row) setEmail(row.email || row.ndcSentTo || "");
  }, [open, row]);

  if (!open || !row) return null;

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/ndc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ndcPayload(row)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Could not generate the NDC PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NDC_${row.loanNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Network error — could not generate the NDC PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const send = async () => {
    if (!email.trim()) {
      toast.warning("Enter the customer's email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/ndc/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ndcPayload(row), toEmail: email, subject }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not send the NDC.");
        return;
      }
      const marked = await sendNdc(row.id, email, subject);
      toast.success(data.message || `NDC emailed to ${email}`);
      onSent(marked.success ? marked.row : row);
    } catch {
      toast.error("Network error — could not send the NDC.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 660 }}>
        <div className={`${styles.modalHead} ${styles.modalHeadSettle}`}>
          <div className={`${styles.modalTitle} ${styles.modalTitleLight}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            No Dues Certificate — Preview &amp; Send
          </div>
          <button type="button" className={`${styles.modalClose} ${styles.modalCloseLight}`} onClick={onClose}>
            {CLOSE_ICON}
          </button>
        </div>
        <div className={styles.modalBody} style={{ padding: 16 }}>
          <NdcPreview row={row} />

          <div style={{ marginTop: 14, background: "var(--bg)", borderRadius: 9, padding: 14 }}>
            <div style={{ fontSize: ".69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-soft)", marginBottom: 10 }}>
              Email Settings
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div className={styles.fieldLabel}>Send To Email <span className={styles.req}>*</span></div>
                <input className={styles.fieldInput} type="email" placeholder="customer@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className={styles.fieldLabel}>Subject</div>
                <input className={styles.fieldInput} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </div>
            {row.ndcSent && (
              <div style={{ fontSize: ".73rem", color: "var(--text-soft)" }}>
                Already sent to {row.ndcSentTo} on {row.ndcSentOn ? new Date(row.ndcSentOn).toLocaleString("en-IN") : "—"}.
              </div>
            )}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Close
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSettle}`} onClick={download} disabled={downloading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} onClick={send} disabled={sending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            {row.ndcSent ? "Resend to Customer" : "Send to Customer"}
            {sending && <span className={styles.spinnerBtn} />}
          </button>
        </div>
      </div>
    </div>
  );
}
