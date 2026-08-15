"use client";

import Modal from "@/components/ui/Modal";
import { coDate, coInr } from "@/components/collection/format";

/**
 * Drilldown for a single Collection Amount tile (all tiles except TOTAL).
 * `rows`: [{ full_name, loan_no, amount, date }]. `isMock` shows a small
 * "estimated" notice for the FRESH/RELOAN tiles, which have no live
 * date-ranged source anywhere in the backend today.
 */
export default function CollectionDrilldownModal({ open, onClose, title, color, totalLabel, isMock, rows }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {isMock && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber/10 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-amber">ⓘ</span>
          <span>
            <strong>Estimated sample data</strong> — there's no live API yet for this breakdown; these figures are
            derived from the real collection total, not exact records.
          </span>
        </div>
      )}

      {totalLabel && (
        <div className="mb-4 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total in range</span>
          <div className="font-display text-xl font-bold" style={{ color }}>
            {totalLabel}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No records found for this category.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="th">Borrower</th>
                <th className="th">Loan No</th>
                <th className="th">Amount</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="td font-medium text-gray-800">{r.full_name || "-"}</td>
                  <td className="td text-accent-dark">{r.loan_no || "-"}</td>
                  <td className="td font-semibold" style={{ color }}>
                    {coInr(r.amount)}
                  </td>
                  <td className="td text-gray-400">{coDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
