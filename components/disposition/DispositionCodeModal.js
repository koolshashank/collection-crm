"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { clientFetch } from "@/lib/clientFetch";
import DispositionTable from "./DispositionTable";

const LIMIT = 25;

/** Records for a single disposition code, paginated inside the modal. */
export default function DispositionCodeModal({ open, onClose, card }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });

  // Reset to page 1 whenever a different card is opened
  useEffect(() => {
    if (open) setPage(1);
  }, [open, card?.code]);

  const load = useCallback(async () => {
    if (!open || !card?.code) return;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      disposition_code: card.code,
    });
    const res = await clientFetch(`/api/disposition/history?${qs.toString()}`);

    if (!res.ok || !res.data?.success) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load records.");
    } else {
      setRows(res.data.rows ?? []);
      setPagination(res.data.pagination ?? { currentPage: 1, totalPages: 1, totalItems: 0 });
    }
    setLoading(false);
  }, [open, card?.code, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (!card) return null;

  const total = Number(pagination.totalItems) || 0;
  const currentPage = Number(pagination.currentPage) || page;
  const totalPages = Number(pagination.totalPages) || 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={
        <span>
          {card.label}{" "}
          <span className="font-mono text-xs font-normal text-gray-400">({card.code})</span>
        </span>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            {total.toLocaleString("en-IN")} record{total === 1 ? "" : "s"}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
            <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <PageLoader label="Loading records…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState icon="🗂️" title="No records" hint={`Nothing found for ${card.code}.`} />
      ) : (
        // Code/Label columns are redundant here — every row has the same one.
        <DispositionTable rows={rows} startIndex={(currentPage - 1) * LIMIT} hideCodeColumns />
      )}
    </Modal>
  );
}
