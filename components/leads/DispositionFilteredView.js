"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/Feedback";
import DispositionTable, { pick } from "@/components/disposition/DispositionTable";
import LeadsPagination from "./LeadsPagination";

/**
 * Shown instead of <LeadsTable> when a Disposition filter is active.
 * /api/leads/list has no way to filter by disposition (confirmed: its
 * passthrough allowlist doesn't include it, and rows carry no disposition
 * data at all) — so this queries /api/disposition/history directly, using
 * ITS real server-side pagination, rather than filtering the loan list
 * client-side (which would silently drop/misscount records on page 2+).
 */
export default function DispositionFilteredView({ code, page, limit, onGotoPage, onChangeLimit }) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], pagination: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const qs = new URLSearchParams({ disposition_code: code, page: String(page), limit: String(limit) });
    const res = await clientFetch(`/api/disposition/history?${qs.toString()}`);
    if (!res.ok || !res.data?.success) {
      setState({
        loading: false,
        error: res.data?.message || res.error || "Could not load disposition records.",
        rows: [],
        pagination: null,
      });
      return;
    }
    setState({ loading: false, error: null, rows: res.data.rows || [], pagination: res.data.pagination || null });
  }, [code, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return (
      <div className="px-5 py-4">
        <PageLoader label="Loading disposition records…" />
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="px-5 py-4">
        <ErrorState message={state.error} onRetry={load} />
      </div>
    );
  }

  const pagination = state.pagination || {};
  const totalItems = pagination.totalItems ?? state.rows.length;
  const totalPages = pagination.totalPages ?? 1;
  const label = pick(state.rows[0], ["disposition_label", "dispositionLabel"]) || code;

  return (
    <div>
      <div className="border-b border-line px-5 py-4 text-sm text-gray-600">
        <strong className="text-gray-800">{totalItems}</strong> record{totalItems === 1 ? "" : "s"} with disposition{" "}
        <span className="badge bg-accent-light text-accent-dark">{label}</span>
      </div>

      {state.rows.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon="🔍"
            title="No Records Found"
            hint="No customers currently have this disposition."
          />
        </div>
      ) : (
        <>
          <DispositionTable rows={state.rows} startIndex={(page - 1) * limit} />
          {totalPages > 1 && (
            <LeadsPagination
              currentPage={page}
              totalPages={totalPages}
              total={totalItems}
              limit={limit}
              onGotoPage={onGotoPage}
              onChangeLimit={onChangeLimit}
            />
          )}
        </>
      )}
    </div>
  );
}
