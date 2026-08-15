"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { clientFetch } from "@/lib/clientFetch";
import { TableWrap, Th, Td, InlineSpinner, CiEmpty } from "./SectionCard";

/**
 * Collection Logs modal — port of ciLoadCollectionLogs()
 * (getCollectionLogs.php → /api/collection-logs). Reloads on every open.
 */
export default function CollectionLogsModal({ open, onClose, leadId }) {
  const [state, setState] = useState({ loading: true, error: false, rows: [] });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setState({ loading: true, error: false, rows: [] });
      const res = await clientFetch(`/api/collection-logs?leadId=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      if (res.status === 0 || (!res.ok && !res.data)) {
        setState({ loading: false, error: true, rows: [] });
        return;
      }
      setState({ loading: false, error: false, rows: res.data?.data || [] });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Collection Logs"
      size="xl"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {state.loading ? (
        <InlineSpinner text="Loading…" />
      ) : state.error ? (
        <CiEmpty error>Error loading logs.</CiEmpty>
      ) : !state.rows.length ? (
        <CiEmpty>No collection logs found.</CiEmpty>
      ) : (
        <TableWrap>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Remarks</Th>
                <Th>Date &amp; Time</Th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((r, i) => (
                <tr key={i} className="hover:bg-accent/5">
                  <Td>{r.emp_name || "--"}</Td>
                  <Td>{r.remarks || "--"}</Td>
                  <Td>{r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "--"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Modal>
  );
}
