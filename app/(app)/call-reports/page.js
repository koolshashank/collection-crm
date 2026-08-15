"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/Feedback";
import CallReportsSummary from "@/components/call-reports/CallReportsSummary";
import CallReportsToolbar from "@/components/call-reports/CallReportsToolbar";
import CallReportsTable from "@/components/call-reports/CallReportsTable";

/**
 * Call Reports — shows every ConVox "Call Status API" event received so
 * far (see app/api/convox/call-status). Currently reads from the local
 * file store (lib/callStatusStore.js); will switch to reading from the
 * team's backend once that storage API exists — see the TODO there.
 */
function CallReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      disposition: searchParams.get("disposition") || "",
      agent: searchParams.get("agent") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      limit: Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1),
      page: Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1),
    }),
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalItems: 0 });
  const [summary, setSummary] = useState({ total: 0, connected: 0, missed: 0, totalDurationSec: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("page", String(filters.page));
    qs.set("limit", String(filters.limit));
    if (filters.search) qs.set("search", filters.search);
    if (filters.disposition) qs.set("disposition", filters.disposition);
    if (filters.agent) qs.set("agent", filters.agent);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);

    const res = await clientFetch(`/api/call-reports/list?${qs.toString()}`);
    if (!res.ok || !res.data?.success) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load call reports.");
    } else {
      setRows(res.data.rows ?? []);
      setPagination(res.data.pagination ?? { currentPage: 1, totalPages: 0, totalItems: 0 });
      setSummary(res.data.summary ?? { total: 0, connected: 0, missed: 0, totalDurationSec: 0 });
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(updates) {
    const next = { ...filters, ...updates };
    if (!("page" in updates)) next.page = 1;
    const qs = new URLSearchParams();
    if (next.search) qs.set("search", next.search);
    if (next.disposition) qs.set("disposition", next.disposition);
    if (next.agent) qs.set("agent", next.agent);
    if (next.from) qs.set("from", next.from);
    if (next.to) qs.set("to", next.to);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    router.push(`/call-reports${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  const total = Number(pagination.totalItems) || 0;
  const currentPage = Number(pagination.currentPage) || filters.page;
  const totalPages = Number(pagination.totalPages) || 0;

  return (
    <>
      <PageHeader
        title="Call Reports"
        subtitle="Every call status event received from ConVox — disposition, duration and recording"
        actions={
          <button type="button" className="btn-secondary" onClick={load}>
            Refresh
          </button>
        }
      />

      <CallReportsSummary summary={summary} />

      <CallReportsToolbar
        filters={filters}
        onApply={(updates) => navigate(updates)}
        onClear={() => navigate({ search: "", disposition: "", agent: "", from: "", to: "" })}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">Call Log</h3>
          <div className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-800">
              {total === 0 ? 0 : (currentPage - 1) * filters.limit + 1}–{Math.min(currentPage * filters.limit, total)}
            </strong>{" "}
            of <strong className="text-gray-800">{total.toLocaleString("en-IN")}</strong> calls
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading call reports…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📞"
            title="No Call Records Found"
            hint="No ConVox call-status events match your current filters yet. They'll show up here as soon as calls come in."
          />
        ) : (
          <CallReportsTable
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

export default function CallReportsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CallReportsContent />
    </Suspense>
  );
}
