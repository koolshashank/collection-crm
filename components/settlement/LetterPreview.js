"use client";

import styles from "./settlement.module.css";
import { fmtInr, fmtDate } from "./settlementUtils";

/**
 * Renders the .letter-preview / .lp-* structure from settlement.php.
 * The PHP paste only had the CSS classes for this, not the actual copy
 * (the JS was cut off before building letterPreview's innerHTML) — this
 * text is synthesized to fit that structure and can be swapped for real
 * backend-rendered letter HTML once the API is wired in.
 */
export default function LetterPreview({ row }) {
  const today = fmtDate(new Date().toISOString());
  return (
    <div className={styles.letterPreview}>
      <div className={styles.lpBody}>
        <div className={styles.lpTitle}>Loan Settlement Letter</div>

        <div className={styles.lpMeta}><strong>Date:</strong> {today}</div>
        <div className={styles.lpMeta}><strong>Loan No:</strong> {row.loanNo}</div>
        <div className={styles.lpMeta}><strong>Borrower:</strong> {row.borrowerName}</div>
        <div className={styles.lpMeta}><strong>Registered Mobile:</strong> {row.mobile || "—"}</div>

        <div className={styles.lpSalutation}>Dear {row.borrowerName || "Customer"},</div>
        <div className={styles.lpGreeting}>We refer to your loan account and the settlement discussion held with our recovery team.</div>

        <div className={styles.lpPara}>
          This is to confirm that BlinkR Loan has agreed to settle the above-referenced loan account against a one-time
          settlement payment as detailed below, in full and final satisfaction of the outstanding dues on this loan,
          subject to receipt of the settlement amount on or before the settlement date mentioned.
        </div>

        <div className={styles.lpSettleBox}>
          <div className={styles.lpSettleRow}><span>Outstanding Amount</span><span>{fmtInr(row.outstanding)}</span></div>
          <div className={styles.lpSettleRow}><span>Settlement Type</span><span>{row.settleType}</span></div>
          <div className={styles.lpSettleRow}><span>Waiver / Concession</span><span>{fmtInr(row.waiver)}</span></div>
          <div className={styles.lpSettleRow}><span>Settlement Date</span><span>{fmtDate(row.settleDate)}</span></div>
          <div className={`${styles.lpSettleRow} ${styles.lpSettleRowLast}`}><span>Settlement Amount Payable</span><span>{fmtInr(row.settleAmt)}</span></div>
        </div>

        <div className={styles.lpPara}>
          Upon realization of the settlement amount in full, your loan account will be marked as "Settled" and no
          further dues shall be payable by you against this loan. Please note that a settled account may be reported
          differently to credit bureaus than a fully closed account.
        </div>

        <div className={styles.lpRegards}>
          Regards,<br />
          <span className={styles.lpTeam}>Recovery &amp; Collections Team</span><br />
          <span className={styles.lpBrand}>BlinkR Loan</span>
        </div>

        <div className={styles.lpStamp}>This is a system-generated settlement letter — demo copy pending real API integration.</div>
      </div>
    </div>
  );
}
