"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState, PageHeader, StatCard } from "@/components/ui/Feedback";
import FieldVisitTable from "@/components/field-visit/FieldVisitTable";
import AssignVisitModal from "@/components/field-visit/AssignVisitModal";

function FieldVisitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1);
  const searchParam = searchParams.get("search") || "";
  const statusParam = searchParams.get("status") || "";
  const agentParam = searchParams.get("agent") || "";
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const [searchInput, setSearchInput] = useState(searchParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, today: 0 });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchParam) qs.set("search", searchParam);
    if (statusParam) qs.set("status", statusParam);
    if (agentParam) qs.set("agent", agentParam);
    if (fromParam) qs.set("from", fromParam);
    if (toParam) qs.set("to", toParam);

    const res = await clientFetch(`/api/field-visits?${qs.toString()}`);
    if (!res.ok || !res.data?.success) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load field visits.");
    } else {
      setRows(res.data.rows ?? []);
      setAgents(res.data.agents ?? []);
      setSummary(res.data.summary ?? { total: 0, pending: 0, completed: 0, today: 0 });
      setPagination(res.data.pagination ?? { currentPage: 1, totalPages: 1, totalItems: 0 });
    }
    setLoading(false);
  }, [page, limit, searchParam, statusParam, agentParam, fromParam, toParam]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(updates) {
    const next = {
      page,
      limit,
      search: searchParam,
      status: statusParam,
      agent: agentParam,
      from: fromParam,
      to: toParam,
      ...updates,
    };
    if (!("page" in updates)) next.page = 1;

    const qs = new URLSearchParams();
    if (next.search) qs.set("search", next.search);
    if (next.status) qs.set("status", next.status);
    if (next.agent) qs.set("agent", next.agent);
    if (next.from) qs.set("from", next.from);
    if (next.to) qs.set("to", next.to);
    if (next.limit && next.limit !== 25) qs.set("limit", String(next.limit));
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    router.push(`/field-visit${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  const total = Number(pagination.totalItems) || 0;
  const currentPage = Number(pagination.currentPage) || page;
  const totalPages = Number(pagination.totalPages) || 1;

  const startP = Math.max(1, currentPage - 3);
  const endP = Math.min(totalPages, startP + 6);
  const pageNums = [];
  for (let p = startP; p <= endP; p++) pageNums.push(p);

  const hasFilters = searchParam || statusParam || agentParam || fromParam || toParam;

  return (
    <>
      <PageHeader
        title="Field Visit"
        subtitle="Assign and track on-ground visits for collection accounts"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={load}>
              Refresh
            </button>
            <button type="button" className="btn-primary" onClick={() => setAssignOpen(true)}>
              + Assign Visit
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Visits" value={summary.total.toLocaleString("en-IN")} icon="📋" />
        <StatCard label="Pending" value={summary.pending.toLocaleString("en-IN")} icon="⏳" tone="amber" />
        <StatCard label="Completed" value={summary.completed.toLocaleString("en-IN")} icon="✅" tone="accent" />
        <StatCard label="Scheduled Today" value={summary.today.toLocaleString("en-IN")} icon="📍" tone="info" />
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: searchInput.trim() });
        }}
        className="card mb-4 flex flex-wrap items-end gap-3 p-4"
      >
        <div className="min-w-[220px] flex-1">
          <label className="label">Search</label>
          <input
            type="text"
            className="input"
            placeholder="Lead ID, loan ID, customer, mobile, agent…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label className="label">Status</label>
          <select className="input" value={statusParam} onChange={(e) => navigate({ status: e.target.value })}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="w-44">
          <label className="label">Agent</label>
          <select className="input" value={agentParam} onChange={(e) => navigate({ agent: e.target.value })}>
            <option value="">All</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="label">From</label>
          <input
            type="date"
            className="input"
            value={fromParam}
            onChange={(e) => navigate({ from: e.target.value })}
          />
        </div>

        <div className="w-40">
          <label className="label">To</label>
          <input type="date" className="input" value={toParam} onChange={(e) => navigate({ to: e.target.value })} />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Search
          </button>
          {hasFilters && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchInput("");
                navigate({ search: "", status: "", agent: "", from: "", to: "" });
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">Assigned Visits</h3>
          <div className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-800">
              {total === 0 ? 0 : (currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}
            </strong>{" "}
            of <strong className="text-gray-800">{total.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading field visits…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📍"
            title="No Field Visits Yet"
            hint={
              hasFilters
                ? "Nothing matched your filters — try clearing them."
                : 'Click "+ Assign Visit" to schedule the first one.'
            }
          />
        ) : (
          <>
            <FieldVisitTable rows={rows} startIndex={(currentPage - 1) * limit} />

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-surface px-5 py-3.5">
                <div className="text-xs text-gray-500">
                  Page <strong className="text-gray-800">{currentPage}</strong> of{" "}
                  <strong className="text-gray-800">{totalPages}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => navigate({ page: currentPage - 1 })}
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {pageNums.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => navigate({ page: p })}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] px-2 text-sm transition ${
                        p === currentPage
                          ? "border-accent bg-accent font-bold text-white"
                          : "border-line bg-white text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => navigate({ page: currentPage + 1 })}
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AssignVisitModal open={assignOpen} onClose={() => setAssignOpen(false)} onSaved={load} />
    </>
  );
}

export default function FieldVisitPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <FieldVisitContent />
    </Suspense>
  );
}
