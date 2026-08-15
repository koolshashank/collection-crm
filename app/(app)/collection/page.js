"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import Spinner, { PageLoader } from "@/components/ui/Spinner";
import { coDate, daysAgoISO, firstOfMonthISO, numberFormat, todayISO } from "@/components/collection/format";
import SummaryKpis from "@/components/collection/SummaryKpis";
import CollectionMix from "@/components/collection/CollectionMix";
import FilterPanel from "@/components/collection/FilterPanel";
import LeadsTable from "@/components/collection/LeadsTable";
import ExportButton from "@/components/collection/ExportButton";

const PER_PAGE = 10; /* fixed at 10 records per page, same as PHP */

function CollectionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ── URL-driven filters (same param names as collection.php) ── */
  const today = todayISO();
  const startDate = searchParams.get("startDate") || firstOfMonthISO();
  let endDate = searchParams.get("endDate") || today;
  if (endDate < startDate) endDate = startDate; /* Keep endDate >= startDate */
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [state, setState] = useState({ loading: true, data: null, apiError: null });
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => setSearchDraft(search), [search]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
      perPage: String(PER_PAGE),
    });
    if (search !== "") params.set("search_text", search);
    const res = await clientFetch(`/api/collection/report?${params.toString()}`);

    if (!res.ok && !res.data) {
      setState({ loading: false, data: null, apiError: res.error || "Could not reach the server." });
      return;
    }
    const decoded = res.data;
    if (!decoded || typeof decoded !== "object") {
      setState({ loading: false, data: null, apiError: `Invalid JSON from server (HTTP ${res.status}).` });
      return;
    }
    if (!decoded.success) {
      setState({
        loading: false,
        data: null,
        apiError: decoded.message || `API returned error (HTTP ${res.status}).`,
      });
      return;
    }
    setState({ loading: false, data: decoded, apiError: null });
  }, [startDate, endDate, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(next) {
    const params = new URLSearchParams();
    if (next.startDate) params.set("startDate", next.startDate);
    if (next.endDate) params.set("endDate", next.endDate);
    if (next.search) params.set("search", next.search);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.replace(`/collection${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  const summary = state.data?.summary ?? {};
  const leads = Array.isArray(state.data?.leads) ? state.data.leads : [];
  const pagination = state.data?.pagination ?? {};
  const totalItems = parseInt(pagination.totalItems ?? leads.length, 10) || 0;
  const totalPages = parseInt(pagination.totalPages ?? Math.max(1, Math.ceil(totalItems / PER_PAGE)), 10) || 1;

  const dateLabel = startDate === endDate ? coDate(startDate) : `${coDate(startDate)} – ${coDate(endDate)}`;
  const filterActive = startDate !== firstOfMonthISO() || endDate !== today || search !== "";

  const quickRanges = [
    { label: "Yesterday", startDate: daysAgoISO(1), endDate: daysAgoISO(1) },
    { label: "Last 7 Days", startDate: daysAgoISO(6), endDate: today },
    { label: "This Month", startDate: firstOfMonthISO(), endDate: today },
    { label: "Last 30 Days", startDate: daysAgoISO(29), endDate: today },
  ];

  if (state.loading && !state.data && !state.apiError) {
    return <PageLoader label="Loading collection report…" />;
  }

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="flex items-center gap-1.5 font-display text-xl font-bold text-gray-800 sm:text-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Collection Report
          </h1>
          <p className="mt-0.5 text-[0.78rem] text-gray-400">Pre, On-time &amp; Post collection breakdown — {dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate({ startDate: today, endDate: today })}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[0.81rem] font-medium transition"
            style={{ background: "rgba(30,126,94,.1)", color: "#1E7E5E", borderColor: "rgba(30,126,94,.25)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Today
          </button>
          {quickRanges.map((q) => (
            <button
              key={q.label}
              onClick={() => navigate({ startDate: q.startDate, endDate: q.endDate })}
              className="btn-secondary text-[0.81rem]"
            >
              {q.label}
            </button>
          ))}
          <button onClick={load} className="btn-secondary inline-flex items-center gap-1.5 text-[0.81rem]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {state.apiError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div className="text-[0.83rem] font-semibold text-danger">{state.apiError}</div>
            <div className="mt-0.5 text-[0.75rem] text-gray-600">
              Check API credentials and network connection. Try refreshing the page.
            </div>
            <button onClick={load} className="btn-secondary mt-2 text-xs">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Summary KPIs + breakdown + mix ── */}
      <SummaryKpis summary={summary} />
      <CollectionMix summary={summary} />

      {/* ── Filters ── */}
      <FilterPanel
        startDate={startDate}
        endDate={endDate}
        search={search}
        dateLabel={dateLabel}
        filterActive={filterActive}
        onApply={(f) => navigate({ startDate: f.startDate, endDate: f.endDate, search: f.search.trim() })}
        onClear={() => navigate({})}
      />

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 font-display text-base text-gray-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-accent">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Collection Leads
            <span className="badge bg-accent-light text-accent-dark">{numberFormat(totalItems)} records</span>
            <span className="badge bg-[#e8f4fd] text-info">
              Page {page} of {totalPages}
            </span>
            {state.loading && <Spinner size={14} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* inline search — keeps the current date range, same as PHP */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ startDate, endDate, search: searchDraft.trim() });
              }}
              className="relative"
            >
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search name, loan, PAN"
                className="input w-[200px] pl-8 text-[0.8rem] focus:w-[240px]"
              />
            </form>
            <ExportButton startDate={startDate} endDate={endDate} search={search} />
          </div>
        </div>

        <LeadsTable
          leads={leads}
          apiError={state.apiError}
          page={page}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={(pg) => navigate({ startDate, endDate, search, page: pg })}
        />
      </div>
    </>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading collection report…" />}>
      <CollectionInner />
    </Suspense>
  );
}
