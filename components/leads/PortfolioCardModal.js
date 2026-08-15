"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ── Same reference data as lead.php (pfRenderFilters) ─────────────────── */
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
  "Chandigarh","Delhi","Jammu & Kashmir","Ladakh","Puducherry"];

const CITIES = ["Agra","Ahmedabad","Ajmer","Aligarh","Allahabad","Amritsar","Aurangabad",
  "Bangalore","Bareilly","Bhopal","Bhubaneswar","Chandigarh","Chennai","Coimbatore",
  "Dehradun","Delhi","Faridabad","Ghaziabad","Gurugram","Guwahati","Gwalior",
  "Hyderabad","Indore","Jabalpur","Jaipur","Jalandhar","Jodhpur","Kanpur",
  "Kochi","Kolkata","Lucknow","Ludhiana","Madurai","Meerut","Mumbai",
  "Mysuru","Nagpur","Nashik","Noida","Patna","Pune","Raipur","Rajkot",
  "Ranchi","Surat","Thane","Vadodara","Varanasi","Visakhapatnam"];

/* pfGetDummyData — verbatim pool + filtering logic from lead.php */
const POOL = [
  {name:"Ravi Kumar",   mobile:"9876543210", city:"Delhi",     state:"Delhi",          loan_id:"BLKR00041001", amount:45000, dpd:0,   status:"Recovered",     agent:"Rahul Sharma", ptp_date:"2026-07-07", ptp_days:4,  ptp_given_by:"Rahul Sharma", close_type:"pre-close",  ptp_status:"upcoming"},
  {name:"Sunita Devi",  mobile:"9812345678", city:"Mumbai",    state:"Maharashtra",    loan_id:"BLKR00041002", amount:72000, dpd:12,  status:"Not Recovered", agent:"Priya Singh",  ptp_date:"2026-06-09", ptp_days:7,  ptp_given_by:"Priya Singh",  close_type:"pre-close",  ptp_status:"upcoming"},
  {name:"Manoj Yadav",  mobile:"9823456789", city:"Lucknow",   state:"Uttar Pradesh",  loan_id:"BLKR00041003", amount:38000, dpd:45,  status:"Part Payment",  agent:"Amit Kumar",   ptp_date:"2026-07-11", ptp_days:10, ptp_given_by:"Amit Kumar",   close_type:"on-time",    ptp_status:"broken"},
  {name:"Priya Sharma", mobile:"9834567890", city:"Pune",      state:"Maharashtra",    loan_id:"BLKR00041004", amount:95000, dpd:0,   status:"Settled",       agent:"Neha Patel",   ptp_date:"2026-06-13", ptp_days:13, ptp_given_by:"Neha Patel",   close_type:"post-close", ptp_status:"broken"},
  {name:"Aman Verma",   mobile:"9845678901", city:"Jaipur",    state:"Rajasthan",      loan_id:"BLKR00041005", amount:55000, dpd:90,  status:"Not Recovered", agent:"Vikram Rao",   ptp_date:"2026-07-15", ptp_days:16, ptp_given_by:"Vikram Rao",   close_type:"pre-close",  ptp_status:"broken"},
  {name:"Kiran Joshi",  mobile:"9856789012", city:"Patna",     state:"Bihar",          loan_id:"BLKR00041006", amount:28000, dpd:0,   status:"Recovered",     agent:"Rahul Sharma", ptp_date:"2026-06-17", ptp_days:19, ptp_given_by:"Rahul Sharma", close_type:"pre-close",  ptp_status:"broken"},
  {name:"Suresh Gupta", mobile:"9867890123", city:"Indore",    state:"Madhya Pradesh", loan_id:"BLKR00041007", amount:63000, dpd:22,  status:"Part Payment",  agent:"Priya Singh",  ptp_date:"2026-07-19", ptp_days:22, ptp_given_by:"Priya Singh",  close_type:"on-time",    ptp_status:"broken"},
  {name:"Anita Rao",    mobile:"9878901234", city:"Hyderabad", state:"Telangana",      loan_id:"BLKR00041008", amount:81000, dpd:0,   status:"Recovered",     agent:"Amit Kumar",   ptp_date:"2026-06-21", ptp_days:25, ptp_given_by:"Amit Kumar",   close_type:"post-close", ptp_status:"broken"},
  {name:"Deepak Mehta", mobile:"9889012345", city:"Ahmedabad", state:"Gujarat",        loan_id:"BLKR00041009", amount:44000, dpd:135, status:"Not Recovered", agent:"Neha Patel",   ptp_date:"2026-07-23", ptp_days:28, ptp_given_by:"Neha Patel",   close_type:"pre-close",  ptp_status:"broken"},
  {name:"Pooja Nair",   mobile:"9890123456", city:"Kochi",     state:"Kerala",         loan_id:"BLKR00041010", amount:52000, dpd:0,   status:"Settled",       agent:"Vikram Rao",   ptp_date:"2026-06-05", ptp_days:1,  ptp_given_by:"Vikram Rao",   close_type:"pre-close",  ptp_status:"upcoming"},
];

function getDummyData(key, subFilter) {
  const k = (key || "").toLowerCase();
  let rows = POOL.filter((r) => {
    if (k.includes("ptp")) return r.dpd > 0;
    if (k.includes("fresh")) return ["1", "3", "5", "7"].includes(r.loan_id.slice(-1));
    if (k.includes("reloan")) return ["2", "4", "6", "8"].includes(r.loan_id.slice(-1));
    if (k.includes("not") || k.includes("overdue")) return r.status.toLowerCase().includes("not");
    if (k.includes("part")) return r.status.toLowerCase().includes("part");
    if (k.includes("recover"))
      return r.status.toLowerCase().includes("recovered") && !r.status.toLowerCase().includes("not");
    if (k.includes("settled")) return r.status.toLowerCase().includes("settled");
    return true;
  });
  if (subFilter) {
    if (k.includes("reloan")) rows = rows.filter((r) => r.close_type === subFilter);
    else if (k.includes("ptp")) rows = rows.filter((r) => r.ptp_status === subFilter);
  }
  return rows;
}

function pfStatusMeta(s) {
  const v = (s || "").toLowerCase();
  if (v.includes("not")) return "bg-red-50 text-danger border-red-200";
  if (v.includes("part")) return "bg-amber/10 text-amber border-amber/40";
  if (v.includes("recovered")) return "bg-accent-light text-accent-dark border-accent/40";
  if (v.includes("settled")) return "bg-blue-50 text-info border-info/40";
  return "bg-gray-100 text-gray-500 border-line";
}

const CLOSE_TYPES = {
  "pre-close": { label: "Pre-Close", cls: "bg-blue-50 text-info border-info/40" },
  "on-time": { label: "On-Time", cls: "bg-accent-light text-accent-dark border-accent/40" },
  "post-close": { label: "Post-Close", cls: "bg-amber/10 text-amber border-amber/40" },
};

export default function PortfolioCardModal({ cardKey, label, onClose }) {
  const k = (cardKey || "").toLowerCase();
  const isReloan = k.includes("reloan");
  const isPtp = k.includes("ptp");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const bodyRef = useRef(null);
  const timerRef = useRef(null);

  /* pfDebounce — 450ms */
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 450);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const all = useMemo(() => getDummyData(cardKey, subFilter), [cardKey, subFilter]);
  const filtered = useMemo(() => all.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.name + r.mobile + r.loan_id).toLowerCase().includes(q)) return false;
    }
    if (state && r.state !== state) return false;
    if (city && r.city !== city) return false;
    return true;
  }), [all, search, state, city]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage);
  const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

  const subCounts = useMemo(() => {
    const base = getDummyData(cardKey, "");
    if (isReloan) {
      return {
        "pre-close": base.filter((r) => r.close_type === "pre-close").length,
        "on-time": base.filter((r) => r.close_type === "on-time").length,
        "post-close": base.filter((r) => r.close_type === "post-close").length,
      };
    }
    if (isPtp) {
      return {
        upcoming: base.filter((r) => r.ptp_status === "upcoming").length,
        ondate: base.filter((r) => r.ptp_status === "ondate").length,
        broken: base.filter((r) => r.ptp_status === "broken").length,
      };
    }
    return {};
  }, [cardKey, isReloan, isPtp]);

  const subCards = isReloan
    ? [
        { key: "pre-close", label: "Pre-Close", on: "bg-info text-white border-info", off: "bg-blue-50 text-info border-info/40" },
        { key: "on-time", label: "On-Time", on: "bg-accent text-white border-accent", off: "bg-accent-light text-accent-dark border-accent/40" },
        { key: "post-close", label: "Post-Close", on: "bg-amber text-white border-amber", off: "bg-amber/10 text-amber border-amber/40" },
      ]
    : isPtp
    ? [
        { key: "upcoming", label: "Upcoming", on: "bg-info text-white border-info", off: "bg-blue-50 text-info border-info/40" },
        { key: "ondate", label: "On-Date", on: "bg-accent text-white border-accent", off: "bg-accent-light text-accent-dark border-accent/40" },
        { key: "broken", label: "Broken", on: "bg-danger text-white border-danger", off: "bg-red-50 text-danger border-red-200" },
      ]
    : [];

  const dpdCls = (dpd) =>
    dpd <= 0 ? "text-accent-dark" : dpd <= 30 ? "text-amber" : dpd <= 90 ? "text-orange-500" : "text-danger";

  /* Pagination window — same math as pfRenderPagination */
  let sp = Math.max(1, safePage - 3);
  let ep = Math.min(pages, sp + 6);
  if (ep - sp < 6) sp = Math.max(1, ep - 6);
  const pageNums = [];
  for (let i = sp; i <= ep; i++) pageNums.push(i);

  return (
    <div
      className="fixed inset-0 z-[650] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-br from-navy to-navy-light px-5 py-4">
          <div>
            <p className="font-display text-base text-white">{label}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {total} record{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/30"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="label">Search</label>
            <input
              className="input w-52"
              type="text"
              placeholder="Name / Mobile / Loan No..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">State</label>
            <select className="input w-44" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
              <option value="">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">City</label>
            <select className="input w-40" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
              <option value="">All Cities</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            className="btn-secondary"
            onClick={() => { setSearchInput(""); setSearch(""); setState(""); setCity(""); setSubFilter(""); setPage(1); }}
          >
            Clear
          </button>

          {subCards.length > 0 && (
            <div className="ml-auto flex items-end gap-2">
              {subCards.map((sc) => {
                const active = subFilter === sc.key;
                return (
                  <button
                    key={sc.key}
                    onClick={() => { setSubFilter(active ? "" : sc.key); setPage(1); }}
                    className={`flex min-w-[82px] flex-col items-center rounded-xl border px-3 py-1.5 text-center transition ${active ? sc.on : sc.off}`}
                  >
                    <span className="text-xs font-bold">{sc.label}</span>
                    <span className="font-display text-lg font-extrabold leading-tight">{subCounts[sc.key] || 0}</span>
                    <span className="text-[10px] opacity-75">leads</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No records match the selected filters.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 border-b border-line bg-surface px-4 py-2 text-xs text-gray-500">
                <span>
                  Showing <strong className="text-gray-700">{rows.length}</strong> of{" "}
                  <strong className="text-gray-700">{total}</strong>
                </span>
                <span>
                  Total Amt: <strong className="text-accent-dark">₹{totalAmt.toLocaleString("en-IN")}</strong>
                </span>
                {isReloan && subFilter && (
                  <span className="badge bg-blue-50 text-info">{CLOSE_TYPES[subFilter]?.label || subFilter}</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface">
                      <th className="th min-w-[140px]">Loan ID</th>
                      <th className="th min-w-[200px]">Borrower &amp; Mobile</th>
                      <th className="th min-w-[100px]">City</th>
                      <th className="th min-w-[110px]">State</th>
                      <th className="th">Amount</th>
                      {isPtp ? (
                        <>
                          <th className="th min-w-[110px]">PTP Date</th>
                          <th className="th min-w-[80px]">PTP Days</th>
                          <th className="th min-w-[140px]">PTP Given By</th>
                        </>
                      ) : isReloan ? (
                        <>
                          <th className="th min-w-[110px]">Close Type</th>
                          <th className="th">DPD</th>
                          <th className="th">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="th">DPD</th>
                          <th className="th">Status</th>
                        </>
                      )}
                      <th className="th">Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const init = (r.name || "?").substring(0, 2).toUpperCase();
                      const ptpDaysCls = r.ptp_days > 30 ? "text-danger" : r.ptp_days > 15 ? "text-amber" : "text-accent-dark";
                      const ct = CLOSE_TYPES[r.close_type];
                      return (
                        <tr key={r.loan_id} className="border-b border-line last:border-0 hover:bg-accent-light/30">
                          <td className="td">
                            <a href={`/collection-dashboard?loan_id=${encodeURIComponent(r.loan_id)}`} className="no-underline">
                              <span className="badge bg-accent-light font-bold text-accent-dark">{r.loan_id}</span>
                            </a>
                          </td>
                          <td className="td">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-light to-accent font-display text-xs font-bold text-white">
                                {init}
                              </span>
                              <span>
                                <span className="block font-semibold text-gray-800">{r.name}</span>
                                <a href={`tel:${r.mobile}`} className="text-xs text-gray-400 no-underline">{r.mobile}</a>
                              </span>
                            </div>
                          </td>
                          <td className="td">{r.city}</td>
                          <td className="td">{r.state}</td>
                          <td className="td font-semibold tabular-nums text-accent-dark">₹{r.amount.toLocaleString("en-IN")}</td>
                          {isPtp ? (
                            <>
                              <td className="td font-semibold">{r.ptp_date || "--"}</td>
                              <td className="td"><span className={`font-bold ${ptpDaysCls}`}>{r.ptp_days ?? "--"} days</span></td>
                              <td className="td text-xs text-gray-500">{r.ptp_given_by || r.agent || "--"}</td>
                            </>
                          ) : isReloan ? (
                            <>
                              <td className="td">{ct && <span className={`badge border ${ct.cls}`}>{ct.label}</span>}</td>
                              <td className="td"><span className={`font-bold ${dpdCls(r.dpd)}`}>{r.dpd}</span></td>
                              <td className="td"><span className={`badge border ${pfStatusMeta(r.status)}`}>{r.status}</span></td>
                            </>
                          ) : (
                            <>
                              <td className="td"><span className={`font-bold ${dpdCls(r.dpd)}`}>{r.dpd}</span></td>
                              <td className="td"><span className={`badge border ${pfStatusMeta(r.status)}`}>{r.status}</span></td>
                            </>
                          )}
                          <td className="td text-xs text-gray-500">{r.agent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(pages > 1 || total > perPage) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
                  <span className="text-xs text-gray-500">
                    Showing <strong className="text-gray-700">{(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, total)}</strong>{" "}
                    of <strong className="text-gray-700">{total}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    Rows:
                    <select
                      className="input !w-auto !px-2 !py-1 text-xs"
                      value={perPage}
                      onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
                    >
                      {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <PageBtn disabled={safePage <= 1} onClick={() => { setPage(safePage - 1); bodyRef.current?.scrollTo(0, 0); }}>‹</PageBtn>
                    {sp > 1 && (
                      <>
                        <PageBtn onClick={() => setPage(1)}>1</PageBtn>
                        {sp > 2 && <span className="px-1 text-gray-400">...</span>}
                      </>
                    )}
                    {pageNums.map((i) => (
                      <PageBtn key={i} current={i === safePage} onClick={() => { setPage(i); bodyRef.current?.scrollTo(0, 0); }}>
                        {i}
                      </PageBtn>
                    ))}
                    {ep < pages && (
                      <>
                        {ep < pages - 1 && <span className="px-1 text-gray-400">...</span>}
                        <PageBtn onClick={() => setPage(pages)}>{pages}</PageBtn>
                      </>
                    )}
                    <PageBtn disabled={safePage >= pages} onClick={() => { setPage(safePage + 1); bodyRef.current?.scrollTo(0, 0); }}>›</PageBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-line bg-surface px-5 py-3">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, current }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-sm transition ${
        current
          ? "border-accent bg-accent font-bold text-white"
          : "border-line bg-panel text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
