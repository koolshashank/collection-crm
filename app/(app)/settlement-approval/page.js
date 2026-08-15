"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useApi } from "@/components/dashboard/shared";
import styles from "@/components/settlement-approval/settlementApproval.module.css";
import KpiStrip from "@/components/settlement-approval/KpiStrip";
import Toolbar from "@/components/settlement-approval/Toolbar";
import RequestsTable from "@/components/settlement-approval/RequestsTable";
import DetailModal from "@/components/settlement-approval/DetailModal";
import DecideModal from "@/components/settlement-approval/DecideModal";
import { fetchSettlements, markLetterSent } from "@/lib/settlementMock";
import { useToast } from "@/components/ui/Toast";

/* Same admin gate as settlement_approval.php ($allowedRoles) and this
   codebase's other admin-only surfaces (settings, audit, /settlement). */
const ADMIN_ROLES = ["ADMIN", "COLLECTION-HEAD", "RECOVERY_HEAD"];

export default function SettlementApprovalPage() {
  const me = useApi("/api/auth/me");
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("");

  const [detailRow, setDetailRow] = useState(null);
  const [decide, setDecide] = useState({ row: null, decision: null });

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

  const rows = state.rows;
  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchQ =
        !q ||
        (r.loanNo || "").toLowerCase().includes(q) ||
        (r.borrowerName || "").toLowerCase().includes(q) ||
        (r.raisedBy || "").toLowerCase().includes(q) ||
        (r.mobile || "").toLowerCase().includes(q);
      const matchSt = status === "all" || r.status === status;
      const matchTp = !type || r.settleType === type;
      return matchQ && matchSt && matchTp;
    });
  }, [rows, search, status, type]);

  const handleMarkLetter = async (row) => {
    const res = await markLetterSent(row.id);
    toast[res.success ? "success" : "error"](res.success ? "Letter marked as sent." : res.message || "Could not update.");
    if (res.success) load();
  };

  if (me.loading) return <PageLoader label="Loading settlement approval…" />;
  if (me.error || !me.data?.user) {
    return <ErrorState message={me.error || "Could not load your session."} onRetry={me.reload} />;
  }

  const user = me.data.user;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = ADMIN_ROLES.some((r) => userRoles.includes(r));
  const currentUser = { id: user.user_id || "", name: user.name || user.username || "Admin" };

  if (!isAdmin) {
    return <ErrorState message="This page is restricted to admin roles." />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.ph}>
          <div>
            <div className={styles.title}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="14 3 14 9 20 9" /><path d="M9 15l2 2 4-4" />
              </svg>
              Settlement Requests
            </div>
            <div className={styles.sub}>Review and approve / reject settlement requests raised by collection executives</div>
          </div>
          <Link href="/settlement" className={styles.raiseLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
            </svg>
            Raise Request
          </Link>
        </div>

        <KpiStrip counts={counts} />

        {state.loading ? (
          <PageLoader label="Loading settlement requests…" />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <>
            <Toolbar
              search={search}
              onSearch={setSearch}
              status={status}
              onStatus={setStatus}
              type={type}
              onType={setType}
              count={filtered.length}
              onRefresh={load}
            />
            <RequestsTable
              rows={filtered}
              onApprove={(row) => setDecide({ row, decision: "approved" })}
              onReject={(row) => setDecide({ row, decision: "rejected" })}
              onMarkLetter={handleMarkLetter}
              onView={setDetailRow}
            />
          </>
        )}
      </div>

      <DetailModal
        open={!!detailRow}
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onApprove={(row) => setDecide({ row, decision: "approved" })}
        onReject={(row) => setDecide({ row, decision: "rejected" })}
        onMarkLetter={handleMarkLetter}
      />
      <DecideModal
        open={!!decide.row}
        row={decide.row}
        decision={decide.decision}
        onClose={() => setDecide({ row: null, decision: null })}
        onDecided={load}
        currentUser={currentUser}
      />
    </div>
  );
}
