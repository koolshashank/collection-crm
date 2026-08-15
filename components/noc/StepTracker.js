"use client";

/**
 * Step tracker — port of noc.php's .step-track
 * (1 Search Loan → 2 Verify Details → 3 Generate NOC → 4 Email / Download).
 */
const STEPS = ["Search Loan", "Verify Details", "Generate NOC", "Email / Download"];

export default function StepTracker({ step = 1 }) {
  return (
    <div className="mb-5 flex items-center gap-0 overflow-x-auto">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} className="flex flex-1 items-center min-w-0">
            <div
              className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                done || active ? "text-gray-800" : "text-gray-400"
              }`}
            >
              <span
                className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all ${
                  done
                    ? "border-accent bg-accent text-white"
                    : active
                    ? "border-navy bg-navy text-white shadow-[0_0_0_4px_rgba(27,42,74,.15)]"
                    : "border-line bg-white"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </div>
            {n < STEPS.length && (
              <div className={`mx-1.5 h-0.5 flex-1 transition-colors ${done ? "bg-accent" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
