"use client";

/**
 * A single settings row with icon, name, Active/Inactive pill, description
 * and an On/Off switch — mirror of the .st-row markup in settings.php.
 */
export default function ToggleRow({ icon, iconClass = "", name, sub, on, onChange }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-800">
            {name}
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                on
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-danger"
              }`}
            >
              {on ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-gray-500">{sub}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className={`min-w-[36px] text-right text-xs font-semibold ${on ? "text-emerald-700" : "text-gray-400"}`}>
          {on ? "On" : "Off"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors ${
            on ? "bg-emerald-700" : "bg-line"
          }`}
        >
          <span
            className={`absolute bottom-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-[24px]" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
}
