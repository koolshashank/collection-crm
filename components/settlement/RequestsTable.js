"use client";

import styles from "./settlement.module.css";
import { fmtInr, fmtDate, initials, avatarClass, STATUS_PILL_CLASS, STATUS_LABEL } from "./settlementUtils";

const HEAD = {
  approval: ["#", "Borrower", "Loan ID", "Outstanding", "Settlement Amt", "DPD", "Raised By", "Reason", "Date", "Action"],
  mine: ["#", "Borrower", "Loan ID", "Outstanding", "Settlement Amt", "DPD", "Status", "Admin Remarks", "Raised On", "Action"],
  approved: ["#", "Borrower", "Loan ID", "Outstanding", "Settlement Amt", "DPD", "Approved On", "Letter Status", "NDC Status", "Actions"],
  all: ["#", "Borrower", "Loan ID", "Outstanding", "Settlement Amt", "DPD", "Raised By", "Status", "Raised On", "Action"],
};

const EMPTY_COPY = {
  approval: { title: "No Pending Requests", sub: "Every settlement request has been reviewed." },
  mine: { title: "No Requests Raised Yet", sub: "Requests you raise will show up here for tracking." },
  approved: { title: "No Approved Cases", sub: "Approved settlements will appear here for letter dispatch." },
  all: { title: "No Settlement Requests", sub: "Nothing matches the current filter." },
};

function DpdTag({ dpd }) {
  return <span className={`${styles.dpdTag} ${dpd < 120 ? styles.dpdTagWarn : ""}`}>{dpd} DPD</span>;
}

function BorrowerCell({ row }) {
  return (
    <div className={styles.borrowerCell}>
      <div className={`${styles.av} ${styles[avatarClass(row.borrowerName)]}`}>{initials(row.borrowerName)}</div>
      <div>
        <div className={styles.borrowerName}>{row.borrowerName || "—"}</div>
        <div className={styles.borrowerLoan}>{row.mobile || "—"}</div>
      </div>
    </div>
  );
}

export default function RequestsTable({ variant, rows, startIndex = 0, onReview, onView, onSendLetter, onSendNdc }) {
  const head = HEAD[variant];

  if (!rows.length) {
    const copy = EMPTY_COPY[variant];
    return (
      <div className={styles.emptyState}>
        <div className={styles.esIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M7 8h10M7 12h6" />
          </svg>
        </div>
        <div className={styles.esTitle}>{copy.title}</div>
        <div className={styles.esSub}>{copy.sub}</div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.stbl}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id}>
              <td>{startIndex + i + 1}</td>
              <td><BorrowerCell row={row} /></td>
              <td><span className={`${styles.pill} ${styles.pillSettle}`}>{row.loanNo}</span></td>
              <td><span className={`${styles.amtCell} ${styles.amtRed}`}>{fmtInr(row.outstanding)}</span></td>
              <td><span className={`${styles.amtCell} ${styles.amtSettle}`}>{fmtInr(row.settleAmt)}</span></td>
              <td><DpdTag dpd={row.dpd} /></td>

              {variant === "approval" && (
                <>
                  <td>{row.raisedBy}</td>
                  <td style={{ maxWidth: 220, whiteSpace: "normal", fontSize: ".74rem", color: "var(--text-mid)" }}>{row.reason}</td>
                  <td>{fmtDate(row.raisedOn)}</td>
                  <td className={styles.actionCell}>
                    <button type="button" className={`${styles.btn} ${styles.btnSettle} ${styles.btnSm}`} onClick={() => onReview(row)}>
                      Review
                    </button>
                  </td>
                </>
              )}

              {variant === "mine" && (
                <>
                  <td><span className={`${styles.pill} ${styles[STATUS_PILL_CLASS[row.status]]}`}>{STATUS_LABEL[row.status]}</span></td>
                  <td style={{ maxWidth: 200, whiteSpace: "normal", fontSize: ".74rem", color: "var(--text-mid)" }}>{row.adminRemarks || "—"}</td>
                  <td>{fmtDate(row.raisedOn)}</td>
                  <td className={styles.actionCell}>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onView(row)}>
                      View
                    </button>
                  </td>
                </>
              )}

              {variant === "approved" && (
                <>
                  <td>{fmtDate(row.decidedOn)}</td>
                  <td>
                    <span className={`${styles.pill} ${row.letterSent ? styles.pillSent : styles.pillPending}`}>
                      {row.letterSent ? "Letter Sent" : "Not Sent"}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${row.ndcSent ? styles.pillSent : styles.pillPending}`}>
                      {row.ndcSent ? "NDC Sent" : "Not Sent"}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <button type="button" className={`${styles.btn} ${styles.btnInfo} ${styles.btnSm}`} onClick={() => onSendLetter(row)}>
                      {row.letterSent ? "View Letter" : "Send Letter"}
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnInfo} ${styles.btnSm}`} onClick={() => onSendNdc(row)}>
                      {row.ndcSent ? "View NDC" : "Send NDC"}
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onView(row)}>
                      View
                    </button>
                  </td>
                </>
              )}

              {variant === "all" && (
                <>
                  <td>{row.raisedBy}</td>
                  <td><span className={`${styles.pill} ${styles[STATUS_PILL_CLASS[row.status]]}`}>{STATUS_LABEL[row.status]}</span></td>
                  <td>{fmtDate(row.raisedOn)}</td>
                  <td className={styles.actionCell}>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onView(row)}>
                      View
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
