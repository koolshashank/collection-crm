"use client";

import { useEffect, useMemo, useState } from "react";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useApi } from "@/components/dashboard/shared";
import styles from "@/components/settlement/settlement.module.css";
import KpiStrip from "@/components/settlement/KpiStrip";
import TabNav from "@/components/settlement/TabNav";
import FilterBar from "@/components/settlement/FilterBar";
import RequestsTable from "@/components/settlement/RequestsTable";
import RaiseRequestModal from "@/components/settlement/RaiseRequestModal";
import ApproveRejectModal from "@/components/settlement/ApproveRejectModal";
import LetterModal from "@/components/settlement/LetterModal";
import DetailModal from "@/components/settlement/DetailModal";
import { fetchSettlements } from "@/lib/settlementMock";

/* Same admin gate this codebase already uses for other admin-only
   surfaces (settings, audit, role-permissions). */
const ADMIN_ROLES = ["ADMIN", "COLLECTION-HEAD", "RECOVERY_HEAD"];

function isHighDpd(row) {
  return row.dpd >= 120;
}
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
function matchesSearch(row, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (row.borrowerName || "").toLowerCase().includes(s) ||
    (row.loanNo || "").toLowerCase().includes(s) ||
    (row.raisedBy || "").toLowerCase().includes(s)
  );
}

export default function SettlementPage() {
  const me = useApi("/api/auth/me");
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  const [activeTab, setActiveTab] = useState(null);
  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalPill, setApprovalPill] = useState("all");
  const [approvedSearch, setApprovedSearch] = useState("");
  const [approvedPill, setApprovedPill] = useState("all");
  const [allStatus, setAllStatus] = useState("all");

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [reviewRow, setReviewRow] = useState(null);
  const [letterRow, setLetterRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetchSettlements();
    if (!res.success) {
      setState({ loading: false, error: "Could not load settlement requests.", rows: [] });
      return;
    }
    setState({ loading: false, error: null, rows: res.rows });
  };

  useEffect(() => {
    load();
  }, []);

  const user = me.data?.user || null;
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = ADMIN_ROLES.some((r) => userRoles.includes(r));
  const currentUser = { id: user?.user_id || "", name: user?.name || user?.username || "You" };

  const effectiveTab = activeTab ?? (isAdmin ? "approval" : "mine");

  const rows = state.rows;
  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    letterSent: rows.filter((r) => r.letterSent).length,
  };

  const pendingRows = rows.filter((r) => r.status === "pending");
  const mineRows = rows.filter((r) => r.raisedByEmpId === currentUser.id || r.raisedBy === currentUser.name);
  const approvedRows = rows.filter((r) => r.status === "approved");

  const tabs = [
    ...(isAdmin ? [{ key: "approval", label: "Approval Queue" }] : []),
    { key: "mine", label: "My Requests" },
    { key: "approved", label: "Approved Cases" },
    ...(isAdmin ? [{ key: "all", label: "All Requests" }] : []),
  ];
  const tabCounts = { approval: pendingRows.length, mine: mineRows.length, approved: approvedRows.length, all: rows.length };

  const approvalFiltered = useMemo(() => {
    return pendingRows.filter((r) => {
      if (!matchesSearch(r, approvalSearch)) return false;
      if (approvalPill === "high") return isHighDpd(r);
      if (approvalPill === "today") return isToday(r.raisedOn);
      return true;
    });
  }, [pendingRows, approvalSearch, approvalPill]);

  const approvedFiltered = useMemo(() => {
    return approvedRows.filter((r) => {
      if (!matchesSearch(r, approvedSearch)) return false;
      if (approvedPill === "notsent") return !r.letterSent;
      if (approvedPill === "sent") return r.letterSent;
      return true;
    });
  }, [approvedRows, approvedSearch, approvedPill]);

  const allFiltered = useMemo(() => {
    if (allStatus === "all") return rows;
    return rows.filter((r) => r.status === allStatus);
  }, [rows, allStatus]);

  const handleCreated = () => load();
  const handleDecided = () => load();
  const handleSent = () => {
    load();
    setLetterRow(null);
  };

  if (me.loading) return <PageLoader label="Loading settlement…" />;
  if (me.error || !user) {
    return <ErrorState message={me.error || "Could not load your session."} onRetry={me.reload} />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageInner}>
        <div className={styles.ph}>
          <div>
            <div className={styles.settleBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Loan Settlement
            </div>
            <div className={styles.phTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><path d="M7 8h10M7 12h6" />
              </svg>
              Settlement Management
              <span className={styles.demoBadge}>Demo Data</span>
            </div>
            <div className={styles.phSub}>Raise · Approve · Dispatch settlement letters to customers</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={load}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSettle}`} onClick={() => setRaiseOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Raise Settlement Request
            </button>
          </div>
        </div>

        <KpiStrip counts={counts} />

        <TabNav tabs={tabs} active={effectiveTab} onChange={setActiveTab} counts={tabCounts} />

        {state.loading ? (
          <PageLoader label="Loading settlement requests…" />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <>
            {effectiveTab === "approval" && isAdmin && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" /><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Pending Settlement Requests
                  </div>
                  <span className={styles.panelCount}>{pendingRows.length} pending</span>
                </div>
                <FilterBar
                  search={approvalSearch}
                  onSearch={setApprovalSearch}
                  placeholder="Search borrower, loan ID, agent…"
                  pills={[
                    { key: "all", label: "All" },
                    { key: "high", label: "High DPD" },
                    { key: "today", label: "Today" },
                  ]}
                  activePill={approvalPill}
                  onPill={setApprovalPill}
                />
                <RequestsTable variant="approval" rows={approvalFiltered} onReview={setReviewRow} />
              </div>
            )}

            {effectiveTab === "mine" && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    My Settlement Requests
                  </div>
                  <button type="button" className={`${styles.btn} ${styles.btnSettle} ${styles.btnSm}`} onClick={() => setRaiseOpen(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Request
                  </button>
                </div>
                <RequestsTable variant="mine" rows={mineRows} onView={setDetailRow} />
              </div>
            )}

            {effectiveTab === "approved" && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approved Settlement Cases — Send Letters
                  </div>
                  <span className={styles.panelCount}>{approvedRows.length} cases</span>
                </div>
                <FilterBar
                  search={approvedSearch}
                  onSearch={setApprovedSearch}
                  placeholder="Search borrower, loan ID…"
                  pills={[
                    { key: "all", label: "All" },
                    { key: "notsent", label: "Letter Pending" },
                    { key: "sent", label: "Letter Sent" },
                  ]}
                  activePill={approvedPill}
                  onPill={setApprovedPill}
                />
                <RequestsTable variant="approved" rows={approvedFiltered} onSendLetter={setLetterRow} onView={setDetailRow} />
              </div>
            )}

            {effectiveTab === "all" && isAdmin && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    </svg>
                    All Settlement Requests
                  </div>
                  <FilterBar
                    select={{
                      value: allStatus,
                      onChange: setAllStatus,
                      options: [
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" },
                      ],
                    }}
                  />
                </div>
                <RequestsTable variant="all" rows={allFiltered} onView={setDetailRow} />
              </div>
            )}
          </>
        )}
      </div>

      <RaiseRequestModal open={raiseOpen} onClose={() => setRaiseOpen(false)} onCreated={handleCreated} currentUser={currentUser} />
      <ApproveRejectModal open={!!reviewRow} row={reviewRow} onClose={() => setReviewRow(null)} onDecided={handleDecided} currentUser={currentUser} />
      <LetterModal open={!!letterRow} row={letterRow} onClose={() => setLetterRow(null)} onSent={handleSent} />
      <DetailModal open={!!detailRow} row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
