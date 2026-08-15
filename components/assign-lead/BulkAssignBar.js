"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import { empId, empOptionLabel } from "./format";

/**
 * Bulk Assign Bar — shows when rows are selected (mirror of assign_lead.php).
 * Field names identical to process_assign.php: loan_ids[] + assignTo.
 */
export default function BulkAssignBar({ selectedCount, employees, submitting, onAssign, onDeselectAll }) {
  const { error } = useToast();
  const [assignTo, setAssignTo] = useState("");

  if (selectedCount === 0) return null;

  function submit() {
    if (!assignTo) {
      error("Please select an agent first.");
      return;
    }
    const label = employees
      .map((e) => ({ id: String(empId(e)), label: empOptionLabel(e) }))
      .find((e) => e.id === assignTo)?.label;
    if (!window.confirm(`Assign ${selectedCount} lead(s) to ${label}?`)) return;
    onAssign(assignTo, label);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-accent/40 bg-gradient-to-r from-accent-light to-amber/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent-dark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span>{selectedCount}</span> leads selected
      </div>
      <span className="hidden text-line sm:inline">|</span>
      <select
        name="assignTo"
        required
        value={assignTo}
        onChange={(e) => setAssignTo(e.target.value)}
        className="input min-w-[210px] flex-1 sm:flex-none"
      >
        <option value="">— Select Agent to Assign —</option>
        {employees.map((emp) => (
          <option key={String(empId(emp))} value={String(empId(emp))}>
            {empOptionLabel(emp)}
          </option>
        ))}
      </select>
      <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
        {submitting ? (
          <span className="flex items-center gap-2">
            <Spinner size={14} className="border-white border-t-transparent" /> Assigning…
          </span>
        ) : (
          "Assign Selected"
        )}
      </button>
      <button type="button" className="btn-secondary" onClick={onDeselectAll}>
        Deselect All
      </button>
    </div>
  );
}
