"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/Feedback";
import PtpSummary from "@/components/ptp/PtpSummary";
import PtpToolbar from "@/components/ptp/PtpToolbar";
import PtpTable from "@/components/ptp/PtpTable";
import { deriveStatus, PRIVILEGED_ROLES } from "@/components/ptp/ptpUtils";

/**
 * Promise to Pay — port of ptp_details.php.
 * Filters/pagination mirror the PHP page (limit 25, ptp_status tabs,
 * date/amount/agent filters). Non-privileged users only see data when
 * searching (Access Restricted state otherwise).
 */
function PtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      search: (searchParams.get("search") || "").trim(),
      ptp_status: searchParams.get("ptp_status") || "all",
      ptp_from: searchParams.get("ptp_from") || "",
      ptp_to: searchParams.get("ptp_to") || "",
      amount_min: searchParams.get("amount_min") || "",
      amount_max: searchParams.get("amount_max") || "",
      agent_name: searchParams.get("agent_name") || "",
      limit: Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1),
      page: Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1),
    }),
    [searchParams]
  );

  const [roles, setRoles] = useState(null); // null = still loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalItems: 0 });

  const isPrivilegedUser = roles ? PRIVILEGED_ROLES.some((r) => roles.includes(r)) : false;
  const restricted = roles !== null && !isPrivilegedUser && !filters.search;

  useEffect(() => {
    let alive = true;
    clientFetch("/api/auth/me").then((res) => {
      if (alive) setRoles(res.ok ? res.data?.user?.roles ?? [] : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (roles === null) return;
    if (restricted) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("page", String(filters.page));
    qs.set("limit", String(filters.limit));
    if (filters.search) qs.set("search", filters.search);
    if (filters.ptp_status !== "all") qs.set("ptp_status", filters.ptp_status);
    if (filters.ptp_from) qs.set("ptp_from", filters.ptp_from);
    if (filters.ptp_to) qs.set("ptp_to", filters.ptp_to);
    if (filters.amount_min) qs.set("amount_min", filters.amount_min);
    if (filters.amount_max) qs.set("amount_max", filters.amount_max);
    if (filters.agent_name) qs.set("agent_name", filters.agent_name);

    const res = await clientFetch(`/api/ptp/all?${qs.toString()}`);
    if (!res.ok || !res.data || res.data.success === false) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load PTP records.");
    } else {
      const data = res.data;
      // Same container fallbacks as PHP: data / ptps / leads
      const list = data.data ?? data.ptps ?? data.leads ?? [];
      const rowsArr = Array.isArray(list) ? list : [];
      const pg = data.pagination ?? {};
      const total = pg.totalItems ?? rowsArr.length;
      setRows(rowsArr);
      setPagination({
        currentPage: pg.currentPage ?? filters.page,
        totalPages: pg.totalPages ?? Math.max(1, Math.ceil(total / filters.limit)),
        totalItems: total,
      });
    }
    setLoading(false);
  }, [roles, restricted, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(updates) {
    const next = { ...filters, ...updates };
    if (!("page" in updates)) next.page = 1;
    const qs = new URLSearchParams();
    if (next.search) qs.set("search", next.search);
    if (next.ptp_status && next.ptp_status !== "all") qs.set("ptp_status", next.ptp_status);
    if (next.ptp_from) qs.set("ptp_from", next.ptp_from);
    if (next.ptp_to) qs.set("ptp_to", next.ptp_to);
    if (next.amount_min) qs.set("amount_min", next.amount_min);
    if (next.amount_max) qs.set("amount_max", next.amount_max);
    if (next.agent_name) qs.set("agent_name", next.agent_name);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    router.push(`/ptp${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  // Summary counts — derived from the current page's data (same fallback as PHP)
  const summary = useMemo(() => {
    const s = { total: Number(pagination.totalItems) || 0, upcoming: 0, today: 0, overdue: 0, broken: 0 };
    for (const row of rows) {
      const st = deriveStatus(row.ptp_date ?? null, row.ptp_outcome ?? null);
      if (st in s && st !== "total") s[st]++;
    }
    return s;
  }, [rows, pagination.totalItems]);

  const total = Number(pagination.totalItems) || 0;
  const currentPage = Number(pagination.currentPage) || filters.page;
  const totalPages = Number(pagination.totalPages) || 0;

  return (
    <>
      <PageHeader title="Promise to Pay" subtitle="Track every PTP commitment across all leads, and whether it was kept" />

      <PtpSummary summary={summary} onSelectStatus={(key) => navigate({ ptp_status: key })} />

      <PtpToolbar
        filters={filters}
        onApply={(updates) => navigate(updates)}
        onClear={() => navigate({ search: "", ptp_from: "", ptp_to: "", amount_min: "", amount_max: "", agent_name: "" })}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">
            PTP Records
            {filters.ptp_status !== "all" && (
              <span className="ml-2 font-sans text-xs font-normal text-gray-400">
                filtered by{" "}
                <strong className="text-accent-dark">
                  {filters.ptp_status.charAt(0).toUpperCase() + filters.ptp_status.slice(1)}
                </strong>
              </span>
            )}
          </h3>
          <div className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-800">
              {((currentPage - 1) * filters.limit + 1).toLocaleString("en-IN")}–
              {Math.min(currentPage * filters.limit, total).toLocaleString("en-IN")}
            </strong>{" "}
            of <strong className="text-gray-800">{total.toLocaleString("en-IN")}</strong> records
          </div>
        </div>

        {roles === null || loading ? (
          <PageLoader label="Loading PTP records…" />
        ) : restricted ? (
          <EmptyState
            icon="🔒"
            title="Access Restricted"
            hint="You don't have permission to view all PTPs. Use search to look up a specific record, or contact your administrator."
          />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon="📅"
              title="No PTP Records Found"
              hint="No promises-to-pay match your current filters. Try adjusting the filters, or check back once agents log new PTPs."
            />
            <div className="flex justify-center">
              <button type="button" className="btn-secondary" onClick={() => router.push("/ptp")}>
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <PtpTable
            rows={rows}
            currentPage={currentPage}
            totalPages={totalPages}
            limit={filters.limit}
            onGoToPage={(p) => navigate({ page: p })}
          />
        )}
      </div>
    </>
  );
}

export default function PtpPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PtpContent />
    </Suspense>
  );
}
