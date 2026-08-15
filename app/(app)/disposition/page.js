"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/Feedback";
import DispositionCards from "@/components/disposition/DispositionCards";
import DispositionCodeModal from "@/components/disposition/DispositionCodeModal";
import DispositionTable from "@/components/disposition/DispositionTable";

function DispositionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1);
  const searchParam = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(searchParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchParam) qs.set("search", searchParam);

    const res = await clientFetch(`/api/disposition/history?${qs.toString()}`);
    if (!res.ok || !res.data?.success) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load disposition history.");
    } else {
      setRows(res.data.rows ?? []);
      setPagination(res.data.pagination ?? { currentPage: 1, totalPages: 1, totalItems: 0 });
    }
    setLoading(false);
  }, [page, limit, searchParam]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate(updates) {
    const next = { page, limit, search: searchParam, ...updates };
    const qs = new URLSearchParams();
    if (next.search) qs.set("search", next.search);
    if (next.limit && next.limit !== 25) qs.set("limit", String(next.limit));
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    router.push(`/disposition${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  const total = Number(pagination.totalItems) || 0;
  const currentPage = Number(pagination.currentPage) || page;
  const totalPages = Number(pagination.totalPages) || 1;

  const startP = Math.max(1, currentPage - 3);
  const endP = Math.min(totalPages, startP + 6);
  const pageNums = [];
  for (let p = startP; p <= endP; p++) pageNums.push(p);

  return (
    <>
      <PageHeader
        title="Disposition History"
        subtitle="Every disposition recorded against loan accounts — click a card to drill into one code"
        actions={
          <button type="button" className="btn-secondary" onClick={load}>
            Refresh
          </button>
        }
      />

      {/* Per-code count cards */}
      <DispositionCards onSelect={setSelectedCard} activeCode={selectedCard?.code} />

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: searchInput.trim(), page: 1 });
        }}
        className="card mb-4 flex flex-wrap items-end gap-3 p-4"
      >
        <div className="min-w-[240px] flex-1">
          <label className="label">Search</label>
          <input
            type="text"
            className="input"
            placeholder="Loan ID, name, mobile, agent…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="w-32">
          <label className="label">Rows</label>
          <select
            className="input"
            value={limit}
            onChange={(e) => navigate({ limit: parseInt(e.target.value, 10), page: 1 })}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Search
          </button>
          {(searchParam || searchInput) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchInput("");
                navigate({ search: "", page: 1 });
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-gray-800">All Records</h3>
          <div className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-800">
              {total === 0 ? 0 : (currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}
            </strong>{" "}
            of <strong className="text-gray-800">{total.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading disposition history…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="No Disposition Records Found"
            hint="Nothing matched your search, or no dispositions have been recorded yet."
          />
        ) : (
          <>
            <DispositionTable rows={rows} startIndex={(currentPage - 1) * limit} />

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

      <DispositionCodeModal
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        card={selectedCard}
      />
    </>
  );
}

export default function DispositionPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DispositionContent />
    </Suspense>
  );
}
