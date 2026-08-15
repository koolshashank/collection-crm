"use client";

import styles from "./settlementApproval.module.css";

export default function Toolbar({ search, onSearch, status, onStatus, type, onType, count, onRefresh }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <input
          type="text"
          placeholder="Search loan no, borrower, agent…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <select className={styles.filter} value={status} onChange={(e) => onStatus(e.target.value)}>
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      <select className={styles.filter} value={type} onChange={(e) => onType(e.target.value)}>
        <option value="">All Types</option>
        <option value="OTS">OTS</option>
        <option value="Full">Full Settlement</option>
        <option value="Partial">Partial</option>
      </select>

      <span className={styles.cnt}>{count} requests</span>

      <button type="button" className={styles.refreshBtn} onClick={onRefresh}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
