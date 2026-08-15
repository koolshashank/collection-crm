"use client";

import Modal from "@/components/ui/Modal";
import { ciDate, ciSafe } from "./helpers";
import { CiEmpty } from "./SectionCard";

/**
 * UPI References modal — renders the mobileData cards fetched via
 * getMobileNumber/{pan}. Field list is verbatim from the PHP modal.
 */
export default function UpiModal({ open, onClose, mobileData, pan }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="UPI References"
      size="xl"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {mobileData && mobileData.length ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {mobileData.map((mob, idx) => {
            const mobFields = [
              ["Total Transactions", mob.transaction_count ?? "--"],
              ["Debit Count", mob.debit_count ?? "--"],
              ["Credit Count", mob.credit_count ?? "--"],
              ["Total Debit", "₹" + (mob.total_debit_amount ?? "--")],
              ["Total Credit", "₹" + (mob.total_credit_amount ?? "--")],
              ["First Transaction", mob.first_transaction ? ciDate(mob.first_transaction) : "--"],
              ["Last Transaction", mob.last_transaction ? ciDate(mob.last_transaction) : "--"],
            ];
            return (
              <div key={idx} className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-2.5 border-b border-line pb-2 font-display text-sm text-gray-800">
                  Mobile {idx + 1} — {ciSafe(mob.mobile_number ?? "")}
                </div>
                {mobFields.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-line py-1 text-xs last:border-b-0">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <CiEmpty>No UPI data found for PAN: {ciSafe(pan)}</CiEmpty>
      )}
    </Modal>
  );
}
