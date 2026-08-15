"use client";

import styles from "./settlement.module.css";

const ICONS = {
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M7 8h10M7 12h6" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  approved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  rejected: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  letters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

export default function KpiStrip({ counts }) {
  const cards = [
    { key: "total", cls: styles.kcSettle, label: "Total Requests", sub: "All time", val: counts.total },
    { key: "pending", cls: styles.kcWarn, label: "Pending Approval", sub: "Awaiting admin", val: counts.pending },
    { key: "approved", cls: styles.kcGreen, label: "Approved", sub: "Letter ready", val: counts.approved },
    { key: "rejected", cls: styles.kcRed, label: "Rejected", sub: "Not approved", val: counts.rejected },
    { key: "letters", cls: styles.kcBlue, label: "Letters Sent", sub: "Emailed to customer", val: counts.letterSent },
  ];

  return (
    <div className={styles.kpiStrip}>
      {cards.map((c) => (
        <div key={c.key} className={`${styles.kc} ${c.cls}`}>
          <div className={styles.kcVal}>{c.val}</div>
          <div className={styles.kcLabel}>{c.label}</div>
          <div className={styles.kcSub}>{c.sub}</div>
          <div className={styles.kcIcon}>{ICONS[c.key]}</div>
        </div>
      ))}
    </div>
  );
}
