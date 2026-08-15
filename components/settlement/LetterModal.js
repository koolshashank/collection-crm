"use client";

import { useEffect, useState } from "react";
import styles from "./settlement.module.css";
import LetterPreview from "./LetterPreview";
import { sendSettlementLetter } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function LetterModal({ open, row, onClose, onSent }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Loan Settlement Letter — BlinkR Loan");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && row) setEmail(row.email || row.letterSentTo || "");
  }, [open, row]);

  if (!open || !row) return null;

  const download = () => {
    toast.info("Demo mode — connect the settlement API to generate a real PDF.");
  };

  const send = async () => {
    if (!email.trim()) {
      toast.warning("Enter the customer's email address.");
      return;
    }
    setSending(true);
    const res = await sendSettlementLetter(row.id, email, subject);
    setSending(false);
    if (res.success) {
      toast.success(`Demo mode — marked as sent to ${email}. Connect the settlement API to send a real email.`);
      onSent(res.row);
    } else {
      toast.error(res.message || "Could not send letter.");
    }
  };

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 660 }}>
        <div className={`${styles.modalHead} ${styles.modalHeadSettle}`}>
          <div className={`${styles.modalTitle} ${styles.modalTitleLight}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            Settlement Letter — Preview &amp; Send
          </div>
          <button type="button" className={`${styles.modalClose} ${styles.modalCloseLight}`} onClick={onClose}>
            {CLOSE_ICON}
          </button>
        </div>
        <div className={styles.modalBody} style={{ padding: 16 }}>
          <LetterPreview row={row} />

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
            {row.letterSent && (
              <div style={{ fontSize: ".73rem", color: "var(--text-soft)" }}>
                Already sent to {row.letterSentTo} on {row.letterSentOn ? new Date(row.letterSentOn).toLocaleString("en-IN") : "—"}.
              </div>
            )}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Close
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSettle}`} onClick={download}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} onClick={send} disabled={sending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            {row.letterSent ? "Resend to Customer" : "Send to Customer"}
            {sending && <span className={styles.spinnerBtn} />}
          </button>
        </div>
      </div>
    </div>
  );
}
