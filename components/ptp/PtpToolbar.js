"use client";

import { useEffect, useState } from "react";
import { STATUS_TABS } from "./ptpUtils";

/**
 * Toolbar + "More Filters" panel + status tabs — mirror of ptp_details.php.
 * Filter field names identical: search, ptp_from, ptp_to, amount_min,
 * amount_max, agent_name, ptp_status.
 */
export default function PtpToolbar({ filters, onApply, onClear }) {
  const [search, setSearch] = useState(filters.search || "");
  const [ptpFrom, setPtpFrom] = useState(filters.ptp_from || "");
  const [ptpTo, setPtpTo] = useState(filters.ptp_to || "");
  const [amountMin, setAmountMin] = useState(filters.amount_min || "");
  const [amountMax, setAmountMax] = useState(filters.amount_max || "");
  const [agentName, setAgentName] = useState(filters.agent_name || "");
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setSearch(filters.search || "");
    setPtpFrom(filters.ptp_from || "");
    setPtpTo(filters.ptp_to || "");
    setAmountMin(filters.amount_min || "");
    setAmountMax(filters.amount_max || "");
    setAgentName(filters.agent_name || "");
    // Auto-open the filter panel if any of its fields already have a value
    if (filters.ptp_from || filters.ptp_to || filters.amount_min || filters.amount_max || filters.agent_name) {
      setPanelOpen(true);
    }
  }, [filters]);

  const hasActiveFilters =
    filters.search || filters.ptp_from || filters.ptp_to || filters.amount_min || filters.amount_max || filters.agent_name;

  function apply(e) {
    e?.preventDefault();
    onApply({
      search: search.trim(),
      ptp_from: ptpFrom,
      ptp_to: ptpTo,
      amount_min: amountMin,
      amount_max: amountMax,
      agent_name: agentName,
    });
  }

  return (
    <form onSubmit={apply}>
      <div className="card mb-4 flex flex-wrap items-center gap-2.5 p-3.5">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, loan ID, mobile"
            className="input w-full pl-9"
          />
        </div>
        <button type="button" className="btn-secondary" onClick={() => setPanelOpen((o) => !o)}>
          More Filters
        </button>
        <button type="submit" className="btn-primary">
          Search
        </button>
        {hasActiveFilters && (
          <button type="button" className="btn-danger" onClick={onClear}>
            Clear
          </button>
        )}

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5 lg:ml-auto">
          {Object.entries(STATUS_TABS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onApply({ ptp_status: key })}
              className={`whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition ${
                filters.ptp_status === key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-gray-600 hover:border-accent hover:text-accent-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {panelOpen && (
        <div className="card mb-4 flex flex-wrap items-end gap-3.5 p-4">
          <div className="flex flex-col gap-1">
            <label className="label">PTP Date From</label>
            <input type="date" name="ptp_from" value={ptpFrom} onChange={(e) => setPtpFrom(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">PTP Date To</label>
            <input type="date" name="ptp_to" value={ptpTo} onChange={(e) => setPtpTo(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Min Amount (₹)</label>
            <input
              type="number"
              name="amount_min"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="input w-[110px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Max Amount (₹)</label>
            <input
              type="number"
              name="amount_max"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="input w-[110px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Agent Name</label>
            <input
              type="text"
              name="agent_name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </div>
      )}
    </form>
  );
}
