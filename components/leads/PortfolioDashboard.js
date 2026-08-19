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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
      {children}
    </svg>
  );
  if (key.includes("total") || key.includes("portfolio"))
    return <P><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></P>;
  if (key.includes("fresh"))
    return <P><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></P>;
  if (key.includes("reloan"))
    return <P><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></P>;
  if (key.includes("ptp"))
    return <P><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></P>;
  if (key.includes("repay"))
    return <P><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="11" x2="12" y2="17" /><polyline points="9 14 12 11 15 14" /></P>;
  if (key.includes("outstanding"))
    return <P><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></P>;
  if (key.includes("active"))
    return <P><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></P>;
  if (key.includes("closed"))
    return <P><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></P>;
  if (key.includes("amount") || key.includes("amt") || key.includes("sanction"))
    return <P><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></P>;
  if (key.includes("dpd") || key.includes("overdue"))
    return <P><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></P>;
  return <P><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></P>;
}

/* Rotating, purely-decorative color per card — order fixed by position, not
   tied to which key it is, so the same key doesn't jump color as the API's
   key order changes. */
const CARD_TONES = [
  { bg: "rgba(15, 155, 142, 0.12)", fg: "#0f9b8e" },
  { bg: "rgba(124, 58, 237, 0.12)", fg: "#7c3aed" },
  { bg: "rgba(59, 110, 165, 0.12)", fg: "#3b6ea5" },
  { bg: "rgba(232, 163, 61, 0.14)", fg: "#c17d1f" },
  { bg: "rgba(214, 69, 69, 0.12)", fg: "#d64545" },
];

/* Friendlier one-line caption for a known key — purely a rewording of the
   label itself, never a separately-sourced fact, so it can't drift from the
   real value shown above it. Unknown keys simply show no caption. */
function captionForKey(k) {
  const key = String(k).toLowerCase();
  if (key.includes("total") || key.includes("portfolio")) return "Active loan accounts";
  if (key.includes("sanction")) return "Total sanctioned amount";
  if (key.includes("repay")) return "Total repayment amount";
  if (key.includes("outstanding")) return "Total outstanding amount";
  if (key.includes("dpd") || key.includes("overdue")) return "Accounts with overdue";
  if (key.includes("fresh")) return "Fresh loan accounts";
  if (key.includes("reloan")) return "Reloan accounts";
  if (key.includes("ptp")) return "Promise-to-pay accounts";
  if (key.includes("active")) return "Currently active accounts";
  if (key.includes("closed")) return "Closed loan accounts";
  return null;
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
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => {
        const isNum = typeof c.value === "number" || (!isNaN(parseFloat(c.value)) && c.value !== "" && c.value !== null);
        const tone = CARD_TONES[i % CARD_TONES.length];
        const caption = captionForKey(c.key);
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onCardClick?.(c.key, c.label)}
            className="card flex items-center gap-3.5 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-pop"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: tone.bg, color: tone.fg }}
            >
              <IconForKey k={c.key} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {c.label}
              </span>
              <span className="block truncate font-display text-lg font-bold text-gray-800">
                {c.type === "amount" ? fmtInr(c.value) : isNum ? numFmt(c.value) : String(c.value)}
              </span>
              <span className="block truncate text-[11px] text-gray-400">
                {c.type === "group" ? `${parseInt(c.value, 10) || 0} items` : caption}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
