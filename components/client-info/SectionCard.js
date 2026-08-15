"use client";

import { CiIcon } from "./icons";

/** Card shell — port of .ci-card / .ci-card-head / .ci-card-body */
export function SectionCard({ id, icon, title, action, children, bodyClassName = "p-4 sm:p-5" }) {
  return (
    <div id={id} className="card mb-4 overflow-hidden scroll-mt-[70px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2 font-display text-base text-gray-800">
          {icon && <CiIcon name={icon} size={17} className="text-accent" />}
          {title}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** Sub-group label — port of .ci-subgroup-label */
export function SubGroup({ label, first = false, children }) {
  return (
    <div className={first ? "" : "mt-5 border-t border-dashed border-line pt-5"}>
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
        <span className="inline-block h-[13px] w-1 rounded bg-accent" />
        {label}
      </div>
      {children}
    </div>
  );
}

/** Info field tile — port of .ci-field */
const INFO_FIELD_TONES = {
  default: { box: "border-line bg-surface", icon: "bg-accent-light text-accent", value: "text-gray-800" },
  alert: { box: "border-danger bg-[#fdf5f5]", icon: "bg-[#fbeaea] text-danger", value: "text-danger" },
  amber: { box: "border-[#f0d9a8] bg-[#fdf6e9]", icon: "bg-[#fbeacb] text-[#8a5a12]", value: "text-[#8a5a12]" },
  blue: { box: "border-[#bcd8f5] bg-[#eef6fd]", icon: "bg-[#d9ecfb] text-[#2563a8]", value: "text-[#2563a8]" },
  purple: { box: "border-[#ddd0f7] bg-[#f6f1fd]", icon: "bg-[#ece2fb] text-[#7c3aed]", value: "text-[#6d28d9]" },
  rose: { box: "border-[#f6c9d6] bg-[#fdf1f5]", icon: "bg-[#fbdde8] text-[#b83280]", value: "text-[#b83280]" },
  teal: { box: "border-[#a8e0d8] bg-[#ecfbf7]", icon: "bg-[#cdf3ea] text-[#0f766e]", value: "text-[#0f766e]" },
};

/**
 * Info field tile — port of .ci-field.
 * `tone` picks a light colour preset (default | alert | amber | blue | purple | rose | teal).
 * `alert`/`highlight` booleans are kept for backward compatibility with existing callers
 * (alert -> "alert" tone, highlight -> "amber" tone) — new code should just pass `tone`.
 */
export function InfoField({ icon, label, value, alert = false, highlight = false, tone }) {
  const resolvedTone = tone || (alert ? "alert" : highlight ? "amber" : "default");
  const t = INFO_FIELD_TONES[resolvedTone] || INFO_FIELD_TONES.default;

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border p-3 transition-shadow hover:shadow-md hover:shadow-accent/10 ${t.box}`}>
      {icon && (
        <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <CiIcon name={icon} size={16} />
        </div>
      )}
      <div className="min-w-0">
        <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div className={`break-words text-sm font-semibold ${t.value}`}>{value}</div>
      </div>
    </div>
  );
}

/** Compact sidebar row — port of .ci-mini-row */
export function MiniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-line py-2 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

/** Table wrapper — port of .ci-table-wrap (responsive) */
export function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-xl border border-line">{children}</div>;
}

export function Th({ children }) {
  return (
    <th className="whitespace-nowrap bg-surface px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

export function Td({ children, colSpan, className = "" }) {
  return (
    <td colSpan={colSpan} className={`border-t border-line px-3.5 py-2.5 align-middle text-sm text-gray-800 ${className}`}>
      {children}
    </td>
  );
}

/** Inline spinner block — port of .ci-spinner-wrap */
export function InlineSpinner({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10">
      <span className="inline-block h-9 w-9 animate-spin rounded-full border-[3px] border-accent-light border-t-accent" />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  );
}

/** Empty text block — port of .ci-empty */
export function CiEmpty({ children, error = false }) {
  return <div className={`p-10 text-center text-sm ${error ? "text-danger" : "text-gray-500"}`}>{children}</div>;
}
