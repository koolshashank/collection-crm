"use client";

import Link from "next/link";
import styles from "./settlementApproval.module.css";
import { fmtInr, fmtDate } from "@/components/settlement/settlementUtils";

const ST_CLASS = { pending: styles.stPending, approved: styles.stApproved, rejected: styles.stRejected };
const ST_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

function dpdStyle(dpd) {
  if (dpd > 90) return { color: "var(--error)", fontWeight: 700 };
  if (dpd > 30) return { color: "#b45309", fontWeight: 600 };
  return { color: "var(--success)" };
}

export default function RequestsTable({ rows, onApprove, onReject, onMarkLetter, onView }) {
  if (!rows.length) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="14 3 14 9 20 9" />
          </svg>
          <div className={styles.emptyTitle}>No requests found</div>
          <p>Try changing the filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div style={{ overflowX: "auto" }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th><th>Loan No</th><th>Borrower</th><th>Outstanding</th><th>Settle Amt</th>
              <th>Waiver</th><th>Type</th><th>DPD</th><th>Raised By</th><th>Raised On</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ color: "var(--text-soft)", fontSize: ".74rem" }}>#{r.id}</td>
                <td>
                  {r.leadId ? (
                    <Link href={`/customer-one-pager?lead_id=${encodeURIComponent(r.leadId)}`} className={styles.loan} target="_blank">
                      {r.loanNo || "—"}
                    </Link>
                  ) : (
                    <span className={styles.loan}>{r.loanNo || "—"}</span>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: ".81rem" }}>{r.borrowerName || "—"}</div>
                  <div style={{ fontSize: ".69rem", color: "var(--text-soft)" }}>{r.mobile || ""}</div>
                </td>
                <td style={{ fontWeight: 700 }}>{fmtInr(r.outstanding)}</td>
                <td style={{ color: "var(--success)", fontWeight: 700 }}>{fmtInr(r.settleAmt)}</td>
                <td style={{ color: "#b45309", fontWeight: 600 }}>{fmtInr(r.waiver)}</td>
                <td><span className={styles.typeBadge}>{r.settleType || "OTS"}</span></td>
                <td style={dpdStyle(r.dpd)}>{r.dpd || 0}d</td>
                <td style={{ fontSize: ".8rem", fontWeight: 600 }}>{r.raisedBy || "—"}</td>
                <td style={{ color: "var(--text-soft)", fontSize: ".76rem", whiteSpace: "nowrap" }}>{fmtDate(r.raisedOn)}</td>
                <td><span className={`${styles.st} ${ST_CLASS[r.status]}`}>{ST_LABEL[r.status]}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 5, flexWrap: "nowrap" }}>
                    {r.status === "pending" && (
                      <>
                        <button type="button" className={`${styles.actionBtn} ${styles.btnApprove}`} onClick={() => onApprove(r)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          Approve
                        </button>
                        <button type="button" className={`${styles.actionBtn} ${styles.btnReject}`} onClick={() => onReject(r)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === "approved" && !r.letterSent && (
                      <button type="button" className={`${styles.actionBtn} ${styles.btnLetter}`} onClick={() => onMarkLetter(r)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                        Letter Sent
                      </button>
                    )}
                    {r.status === "approved" && r.letterSent && <span className={styles.letterSentTag}>✓ Letter Sent</span>}
                    <button type="button" className={`${styles.actionBtn} ${styles.btnView}`} onClick={() => onView(r)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
