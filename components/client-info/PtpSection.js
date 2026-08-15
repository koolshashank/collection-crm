"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { CiIcon } from "./icons";
import { SectionCard, TableWrap, Th, Td, CiEmpty, InlineSpinner } from "./SectionCard";

/* Same option list for both selects — verbatim from the PHP modal */
const PTP_ACTIONS = [
  "Contacted customer and agreed on payment date",
  "Follow up on agreed date",
  "Customer will pay partial amount",
  "Formal collection email to customer",
  "Field Visit Assign",
  "Field Visit Active",
];

/**
 * Promise to Pay — list card (get_ptp_list.php → /api/ptp/list) +
 * Add PTP modal (submit_ptp.php → /api/ptp/submit).
 * Rendered only for ADMIN | COLLECTION-HEAD | COLLECTION-EXECUTIVE
 * (checked by the parent page).
 */
export default function PtpSection({ leadId }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: false, rows: [] });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ptp_date: "", ptp_amount: "", action_taken: "", action_required: "", remarks: "" });

  const load = useCallback(async () => {
    setState({ loading: true, error: false, rows: [] });
    const res = await clientFetch(`/api/ptp/list?leadId=${encodeURIComponent(leadId)}`);
    if (res.status === 0) {
      setState({ loading: false, error: true, rows: [] });
      return;
    }
    setState({ loading: false, error: false, rows: res.data?.data || [] });
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /* ── Submit PTP (verbatim payload: lead_id, ptp_date, ptp_amount,
        action_taken, action_required, remarks) ── */
  async function submitPtp() {
    const d = { lead_id: leadId, ...form };
    if (!d.ptp_date || !d.ptp_amount || !d.action_taken || !d.action_required || !d.remarks) {
      return toast.error("Please fill all PTP fields.");
    }
    setSaving(true);
    const res = await postJson("/api/ptp/submit", d);
    setSaving(false);
    if (res.status === 0) return toast.error("Network error.");
    if (res.data?.success) {
      toast.success("PTP saved!");
      setOpen(false);
      setForm({ ptp_date: "", ptp_amount: "", action_taken: "", action_required: "", remarks: "" });
      load();
    } else {
      toast.error("Error: " + (res.data?.message || "Failed"));
    }
  }

  return (
    <>
      <SectionCard
        id="sec-ptp"
        icon="cal"
        title="Promise to Pay"
        action={
          <button className="btn-primary !px-3 !py-1.5 !text-xs" onClick={() => setOpen(true)}>
            <CiIcon name="plus" size={13} strokeWidth={2} />
            Add PTP
          </button>
        }
      >
        <TableWrap>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>PTP Date</Th>
                <Th>Amount</Th>
                <Th>Action Taken</Th>
                <Th>Action Required</Th>
                <Th>Remarks</Th>
                <Th>Entry Date</Th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <tr>
                  <Td colSpan={6}>
                    <InlineSpinner text="Loading…" />
                  </Td>
                </tr>
              ) : state.error ? (
                <tr>
                  <Td colSpan={6}>
                    <CiEmpty error>Error loading PTP.</CiEmpty>
                  </Td>
                </tr>
              ) : !state.rows.length ? (
                <tr>
                  <Td colSpan={6}>
                    <CiEmpty>No PTP records found.</CiEmpty>
                  </Td>
                </tr>
              ) : (
                state.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/5">
                    <Td>{r.ptp_date ? new Date(r.ptp_date).toLocaleDateString("en-IN") : "--"}</Td>
                    <Td>₹{Number(r.ptp_amount || 0).toLocaleString("en-IN")}</Td>
                    <Td>{r.action_taken || "--"}</Td>
                    <Td>{r.action_required || "--"}</Td>
                    <Td>{r.remarks || "--"}</Td>
                    <Td>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "--"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrap>
      </SectionCard>

      {/* ── Add Promise to Pay modal ── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Promise to Pay"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitPtp} disabled={saving}>
              {saving ? "Submitting…" : "Submit PTP"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="label">PTP Date *</label>
            <input className="input" type="date" value={form.ptp_date} onChange={(e) => set("ptp_date", e.target.value)} />
          </div>
          <div>
            <label className="label">PTP Amount *</label>
            <input
              className="input"
              type="number"
              placeholder="Enter amount"
              value={form.ptp_amount}
              onChange={(e) => set("ptp_amount", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Action Taken *</label>
            <select className="input" value={form.action_taken} onChange={(e) => set("action_taken", e.target.value)}>
              <option value="">— Select —</option>
              {PTP_ACTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Action Required *</label>
            <select className="input" value={form.action_required} onChange={(e) => set("action_required", e.target.value)}>
              <option value="">— Select —</option>
              {PTP_ACTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3.5">
          <label className="label">Remarks *</label>
          <input className="input" placeholder="Enter remarks" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
