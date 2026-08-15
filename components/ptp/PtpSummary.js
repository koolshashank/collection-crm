"use client";

/**
 * Summary cards strip — Total PTPs / Upcoming / Due Today / Overdue / Broken.
 * Clicking a card filters by that status (page reset to 1) — same as PHP.
 */
const CARDS = [
  { key: "all", label: "Total PTPs", stripe: "#0f9b8e" },
  { key: "upcoming", label: "Upcoming", stripe: "#1a6fa8" },
  { key: "today", label: "Due Today", stripe: "#b7770d" },
  { key: "overdue", label: "Overdue", stripe: "#C0392B" },
  { key: "broken", label: "Broken", stripe: "#7a1f1f" },
];

export default function PtpSummary({ summary, onSelectStatus }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
      {CARDS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onSelectStatus(c.key)}
          className="card relative flex flex-col gap-1 overflow-hidden p-4 text-left transition hover:shadow-pop"
          style={{ borderLeft: `3px solid ${c.stripe}` }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{c.label}</span>
          <span className="font-display text-2xl font-bold leading-none text-gray-800">
            {Number(summary[c.key === "all" ? "total" : c.key] || 0).toLocaleString("en-IN")}
          </span>
        </button>
      ))}
    </div>
  );
}
