"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { clientFetch } from "@/lib/clientFetch";
import { TableWrap, Th, Td, InlineSpinner, CiEmpty } from "./SectionCard";

/**
 * Additional-documents fetcher — port of ciOpenDocModal()/ciOpenAllDocs().
 * The PHP endpoint (get_aditional_doc.php → /api/docs/additional) returns an
 * HTML fragment which the page injected as-is, so we do the same.
 */
function useAdditionalDocs(open, leadId) {
  const [state, setState] = useState({ loading: true, error: false, html: "" });
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setState({ loading: true, error: false, html: "" });
      const res = await clientFetch(`/api/docs/additional?lead_id=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      if (res.status === 0 || !res.ok) {
        setState({ loading: false, error: true, html: "" });
        return;
      }
      const html = typeof res.data === "string" ? res.data : res.data?.html || "";
      setState({ loading: false, error: false, html });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);
  return state;
}

function AdditionalDocsBody({ state, emptyMessage }) {
  if (state.loading) return <InlineSpinner />;
  if (state.error) return <CiEmpty error>Failed to load additional documents.</CiEmpty>;
  if (!state.html) return <CiEmpty>{emptyMessage}</CiEmpty>;
  /* Legacy endpoint returns a trusted HTML fragment (same as the PHP page) */
  return <div className="ci-docs-html overflow-x-auto" dangerouslySetInnerHTML={{ __html: state.html }} />;
}

/** More Documents modal (docListModal) */
export function DocListModal({ open, onClose, leadId }) {
  const state = useAdditionalDocs(open, leadId);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Additional Documents"
      size="xl"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <AdditionalDocsBody state={state} emptyMessage="No additional documents found." />
    </Modal>
  );
}

/** Complete Lead Logs modal (logsModal) — get_logs.php → /api/logs */
export function LogsModal({ open, onClose, leadId }) {
  const [state, setState] = useState({ loading: true, error: false, rows: [] });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setState({ loading: true, error: false, rows: [] });
      const res = await clientFetch(`/api/logs?lead_id=${encodeURIComponent(leadId)}`);
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
      title="Complete Lead Logs"
      size="xl"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {state.loading ? (
        <InlineSpinner />
      ) : state.error ? (
        <CiEmpty error>Error loading logs.</CiEmpty>
      ) : !state.rows.length ? (
        <CiEmpty>No logs found.</CiEmpty>
      ) : (
        state.rows.map((item, i) => (
          <div key={i} className="mb-2.5 rounded-xl border border-line bg-accent-light p-3.5">
            <div className="mb-1 text-xs text-gray-500">
              Log #{i + 1} &nbsp;·&nbsp; {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : ""}
            </div>
            <div className="text-sm text-gray-800">{item.remarks || ""}</div>
          </div>
        ))
      )}
    </Modal>
  );
}

/** All Documents modal (allDocsModal) — static rows + additional docs */
export function AllDocsModal({ open, onClose, loan, leadId }) {
  const state = useAdditionalDocs(open, leadId);
  const docLink =
    "inline-block rounded bg-accent-light px-2 py-[3px] text-xs font-bold text-accent-dark no-underline hover:bg-accent hover:text-white";
  const docLeadId = loan.lead_id ?? leadId;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="All Documents"
      size="xl"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="mb-4">
        <TableWrap>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Document Type</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Sanction Letter</Td>
                <Td>
                  <a
                    className={docLink}
                    href={`/api/docs/sanction?lead_id=${encodeURIComponent(docLeadId)}&doc_type=SANCTION_LETTER`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </Td>
              </tr>
              <tr>
                <Td>Aadhaar Card</Td>
                <Td>
                  <a
                    className={docLink}
                    href={`/api/docs/aadhar?lead_id=${encodeURIComponent(docLeadId)}&doc_type=AADHAAR`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </Td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
      </div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Additional Documents</div>
      <AdditionalDocsBody state={state} emptyMessage="No additional documents found." />
    </Modal>
  );
}
