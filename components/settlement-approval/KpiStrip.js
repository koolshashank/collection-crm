"use client";

import styles from "./settlementApproval.module.css";

export default function KpiStrip({ counts }) {
  return (
    <div className={styles.kpiStrip}>
      <div className={`${styles.kpi} ${styles.kAll}`}>
        <div className={styles.kpiVal}>{counts.total}</div>
        <div className={styles.kpiLbl}>Total Requests</div>
      </div>
      <div className={`${styles.kpi} ${styles.kPend}`}>
        <div className={styles.kpiVal} style={{ color: "#b45309" }}>{counts.pending}</div>
        <div className={styles.kpiLbl}>Pending</div>
      </div>
      <div className={`${styles.kpi} ${styles.kAppr}`}>
        <div className={styles.kpiVal} style={{ color: "var(--success)" }}>{counts.approved}</div>
        <div className={styles.kpiLbl}>Approved</div>
      </div>
      <div className={`${styles.kpi} ${styles.kRej}`}>
        <div className={styles.kpiVal} style={{ color: "var(--error)" }}>{counts.rejected}</div>
        <div className={styles.kpiLbl}>Rejected</div>
      </div>
    </div>
  );
}
