"use client";

import { useEffect, useState } from "react";

/* Keys excluded from the hidden pass-through (same list as the PHP form) */
const FORM_KEYS = [
  "search", "from_date", "to_date", "min_amount", "max_amount",
  "part_payment", "status", "limit", "sort", "order", "page",
];

export default function LeadsToolbar({
  search,
  limit,
  hasFilter,
  sort,
  statusFilter,
  currentParams,
  onNavigate,
  onOpenSortFilter,
}) {
  const [searchValue, setSearchValue] = useState(search);
  useEffect(() => { setSearchValue(search); }, [search]);

  /* Mirror of the PHP GET form: other params preserved, page resets */
  const submit = (overrides = {}) => {
    const params = {};
    Object.entries(currentParams).forEach(([k, v]) => {
      if (!FORM_KEYS.includes(k)) params[k] = v;
    });
    if (statusFilter !== "all") params.status = statusFilter;
    if (sort) {
      params.sort = sort;
      params.order = currentParams.order || "asc";
    }
    const s = (overrides.search ?? searchValue).trim();
    if (s) params.search = s;
    params.limit = overrides.limit ?? limit;
    onNavigate(params);
  };

  return (
    <div className="card flex flex-wrap items-center gap-2.5 p-3.5">
      {/* Search */}
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
          className="input w-full pl-9"
          placeholder="Search by name, loan ID, mobile, city"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
          }}
        />
      </div>

      <span className="hidden h-7 w-px shrink-0 bg-line sm:block" />

      {/* Rows per page */}
      <label className="flex items-center gap-2 text-xs text-gray-500">
        <span>Rows</span>
        <select
          className="input !w-auto !py-1.5"
          value={limit}
          onChange={(e) => submit({ limit: e.target.value })}
        >
          {[10, 25, 50, 100].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      {/* Sort & Filter */}
      <button type="button" className="btn-secondary" onClick={onOpenSortFilter}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 inline h-3.5 w-3.5">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Sort &amp; Filter
        {(hasFilter || sort) && (
          <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">ON</span>
        )}
      </button>

      <button type="button" className="btn-primary" onClick={() => submit()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 inline h-3.5 w-3.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search
      </button>

      {(search || hasFilter) && (
        <button type="button" className="btn-danger" onClick={() => onNavigate({})}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}
