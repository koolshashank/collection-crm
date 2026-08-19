"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { clientFetch } from "@/lib/clientFetch";

function pick(row, keys) {
  for (const k of keys) if (row?.[k]) return row[k];
  return "";
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    clearTimeout(debounceRef.current);

    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      setError("");
      setOpen(q.length > 0);
      return;
    }

    setLoading(true);
    setError("");
    const myId = ++reqIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const res = await clientFetch(`/api/leads/list?search=${encodeURIComponent(q)}&limit=8`);
      if (myId !== reqIdRef.current) return; // a newer keystroke already superseded this request
      setLoading(false);
      if (!res.ok) {
        setError(res.error || "Search failed");
        setResults([]);
      } else {
        setResults(Array.isArray(res.data?.leads) ? res.data.leads : []);
      }
      setOpen(true);
      setActiveIndex(-1);
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const goTo = (row) => {
    const leadId = pick(row, ["lead_id", "leadId"]);
    if (!leadId) return;
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/customer-one-pager?lead_id=${encodeURIComponent(leadId)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (row) goTo(row);
    }
  };

  const showDropdown = open && query.trim().length > 0;

  const box = (
    <div className="relative w-full">
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
      />
      <input
        autoFocus={mobileOpen}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search PAN, mobile or loan ID…"
        className="w-full rounded-full border border-white/15 bg-white/5 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none transition focus:border-accent focus:bg-white/10 sm:text-[13px]"
      />
      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[300] w-full min-w-[280px] overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          {loading && <div className="px-4 py-3 text-xs text-gray-500">Searching…</div>}
          {!loading && error && <div className="px-4 py-3 text-xs text-danger">{error}</div>}
          {!loading && !error && query.trim().length < 3 && (
            <div className="px-4 py-3 text-xs text-gray-400">Keep typing… (min 3 characters)</div>
          )}
          {!loading && !error && query.trim().length >= 3 && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-500">No matching customer found</div>
          )}
          {!loading && !error && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((row, i) => {
                const leadId = pick(row, ["lead_id", "leadId"]);
                const name = row.full_name || "—";
                const loanId = row.loan_id || row.loan_no || "—";
                const mobile = row.mobile || "—";
                const pan = row.pan || "";
                return (
                  <li key={`${leadId}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goTo(row)}
                      className={`flex w-full flex-col gap-0.5 px-4 py-2 text-left transition ${
                        i === activeIndex ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-sm font-semibold text-gray-800">{name}</span>
                      <span className="text-[11px] text-gray-500">
                        Loan: {loanId} · Mobile: {mobile}
                        {pan ? ` · PAN: ${pan}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="flex flex-1 items-center justify-center px-1 sm:px-3">
      <div className="hidden w-full max-w-xs sm:block md:max-w-sm">{box}</div>
      <div className="sm:hidden">
        {!mobileOpen ? (
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/70"
            aria-label="Search"
          >
            <Icon name="search" size={16} />
          </button>
        ) : (
          <div className="fixed inset-x-3 top-[70px] z-[300]">{box}</div>
        )}
      </div>
    </div>
  );
}
