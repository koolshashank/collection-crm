"use client";

import { fmtInr, numFmt } from "./leadUtils";

/* pf_label_from_key — verbatim port */
function labelFromKey(k) {
  let s = String(k).replace(/[_-]/g, " ");
  s = s.replace(/(?<!^)([A-Z])/g, " $1");
  let label = s.trim().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const overrides = { "Total Portfolio": "Total Leads", "Ptp Leads": "PTP Leads" };
  if (overrides[label]) label = overrides[label];
  return label;
}

/* pf_icon_for_key — same keyword mapping, inline SVG icons */
function IconForKey({ k }) {
  const key = String(k).toLowerCase();
  const P = ({ children }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      {children}
    </svg>
  );
  if (key.includes("total") || key.includes("portfolio"))
    return <P><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" /></P>;
  if (key.includes("fresh"))
    return <P><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></P>;
  if (key.includes("reloan"))
    return <P><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></P>;
  if (key.includes("ptp"))
    return <P><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></P>;
  if (key.includes("active"))
    return <P><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></P>;
  if (key.includes("closed"))
    return <P><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></P>;
  if (key.includes("amount") || key.includes("amt"))
    return <P><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></P>;
  if (key.includes("dpd") || key.includes("overdue"))
    return <P><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></P>;
  return <P><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></P>;
}

/* Build the display cards exactly like lead.php ($pfCards loop) */
export function buildPfCards(dashboard) {
  const cards = [];
  if (!dashboard || typeof dashboard !== "object") return cards;
  for (const [k, v] of Object.entries(dashboard)) {
    if (String(k).toLowerCase().includes("assigned")) continue;
    if (Array.isArray(v) || (v && typeof v === "object")) {
      cards.push({ key: k, label: labelFromKey(k), value: Array.isArray(v) ? v.length : Object.keys(v).length, type: "group" });
    } else {
      const lk = String(k).toLowerCase();
      const isAmount =
        lk.includes("amount") || lk.includes("amt") || lk.includes("sanction") ||
        lk.includes("repay") || lk.includes("outstanding") || lk.includes("claim") ||
        lk.includes("disbursed");
      cards.push({ key: k, label: labelFromKey(k), value: v, type: isAmount ? "amount" : "count" });
    }
  }
  return cards;
}

export default function PortfolioDashboard({ loading, error, dashboard, onCardClick }) {
  if (loading) {
    return (
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse p-4">
            <div className="mb-3 h-8 w-8 rounded-lg bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mb-5 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm text-danger">
        Dashboard API error: {error}
      </div>
    );
  }

  const cards = buildPfCards(dashboard);
  if (!cards.length) {
    return (
      <div className="card mb-5 border-l-4 border-line bg-surface px-4 py-3 text-sm text-gray-500">
        No dashboard data returned.
      </div>
    );
  }

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((c) => {
        const isNum = typeof c.value === "number" || (!isNaN(parseFloat(c.value)) && c.value !== "" && c.value !== null);
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onCardClick?.(c.key, c.label)}
            className="card group relative overflow-hidden p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-pop"
          >
            <span className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full bg-accent-light opacity-50 transition group-hover:scale-125" />
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent-dark">
              <IconForKey k={c.key} />
            </span>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
            <p className="mt-0.5 truncate font-display text-lg font-bold text-gray-800">
              {c.type === "amount" ? fmtInr(c.value) : isNum ? numFmt(c.value) : String(c.value)}
            </p>
            {c.type === "group" && <p className="text-[11px] text-gray-400">{parseInt(c.value, 10) || 0} items</p>}
          </button>
        );
      })}
    </div>
  );
}
