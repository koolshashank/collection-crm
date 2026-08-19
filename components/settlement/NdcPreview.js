"use client";

import styles from "./settlement.module.css";
import { fmtInr, fmtDate } from "./settlementUtils";

/**
 * Quick in-modal preview of the No Dues Certificate — same structure as
 * LetterPreview.js. The real PDF (built by lib/ndc/pdf.js from the admin
 * template in Settings) is what actually gets downloaded/emailed; this is
 * just a fast on-screen look before that.
 */
export default function NdcPreview({ row }) {
  const today = fmtDate(new Date().toISOString());
  return (
    <div className={styles.letterPreview}>
      <div className={styles.lpBody}>
        <div className={styles.lpTitle}>No Dues Certificate</div>

        <div className={styles.lpMeta}><strong>Date:</strong> {today}</div>
        <div className={styles.lpMeta}><strong>Loan No:</strong> {row.loanNo}</div>
        <div className={styles.lpMeta}><strong>Borrower:</strong> {row.borrowerName}</div>
        <div className={styles.lpMeta}><strong>PAN:</strong> {row.pan || "—"}</div>

        <div className={styles.lpSalutation}>Dear {row.borrowerName || "Customer"},</div>

        <div className={styles.lpPara}>
          This is to certify that your loan account bearing Loan Account Number {row.loanNo} with BlinkR Loan was
          settled under a One-Time Settlement (OTS) arrangement.
        </div>

        <div className={styles.lpSettleBox}>
          <div className={styles.lpSettleRow}><span>Settlement Amount Received</span><span>{fmtInr(row.settleAmt)}</span></div>
          <div className={styles.lpSettleRow}><span>Settlement Date</span><span>{fmtDate(row.settleDate)}</span></div>
          <div className={`${styles.lpSettleRow} ${styles.lpSettleRowLast}`}><span>Waiver / Concession</span><span>{fmtInr(row.waiver)}</span></div>
        </div>

        <div className={styles.lpPara}>
          As on date, there are no further dues, liabilities, or obligations payable against this loan account. As
          this account was settled rather than repaid in full, it may be reported to credit bureaus as &quot;Settled&quot;
          rather than &quot;Closed&quot;.
        </div>

        <div className={styles.lpRegards}>
          Regards,<br />
          <span className={styles.lpTeam}>Team BlinkR Loan</span>
        </div>

        <div className={styles.lpStamp}>This is a preview — the actual PDF uses the NDC Template configured in Settings.</div>
      </div>
    </div>
  );
}
