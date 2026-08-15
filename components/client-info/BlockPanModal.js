"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { postJson } from "@/lib/clientFetch";
import { CiIcon } from "./icons";
import { ciSafe } from "./helpers";

/**
 * Block PAN modal — port of ciSubmitBlockPAN().
 * Confirmation step keeps the SweetAlert wording:
 * "Block this PAN?" / "This will prevent future loan applications." / "Yes, Block".
 * POST /api/pan/block { pan_number, reason } — response { status, message }.
 */
export default function BlockPanModal({ open, onClose, pan }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setConfirming(false);
      setSubmitting(false);
    }
  }, [open]);

  function askConfirm() {
    if (!reason.trim()) return toast.error("Please enter a reason.");
    setConfirming(true);
  }

  async function submit() {
    setSubmitting(true);
    const res = await postJson("/api/pan/block", { pan_number: ciSafe(pan), reason: reason.trim() });
    setSubmitting(false);
    const d = res.data || {};
    const ok = d.status === "success";
    if (ok) toast.success(d.message || "Done");
    else toast.error(d.message || "Done");
    if (ok) onClose();
    else setConfirming(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block PAN"
      size="sm"
      footer={
        confirming ? (
          <>
            <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn-danger" onClick={submit} disabled={submitting}>
              {submitting ? "Blocking…" : "Yes, Block"}
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-danger" onClick={askConfirm}>
              Block PAN
            </button>
          </>
        )
      }
    >
      {confirming ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/10 text-amber">
            <CiIcon name="warn" size={26} strokeWidth={2} />
          </div>
          <div className="font-display text-lg font-semibold text-gray-800">Block this PAN?</div>
          <p className="text-sm text-gray-500">This will prevent future loan applications.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#f5c6c6] bg-[#fbeaea] p-3.5">
            <CiIcon name="warn" size={20} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <div className="text-sm font-semibold text-danger">Block PAN</div>
              <div className="mt-0.5 text-xs text-gray-600">
                This will prevent the customer from applying for new loans.
              </div>
            </div>
          </div>
          <div className="mb-3.5">
            <label className="label">PAN Number</label>
            <input className="input bg-surface" value={ciSafe(pan)} readOnly />
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea
              className="input resize-y"
              rows={3}
              placeholder="Enter reason for blocking…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
