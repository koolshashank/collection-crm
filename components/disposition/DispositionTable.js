"use client";

import Link from "next/link";
import { toneForCode } from "./dispositionTones";

/**
 * Shared disposition table — used by the main page and by the per-code modal.
 *
 * Each column lists candidate keys because the exact field names in the
 * upstream response weren't confirmed; the first key present on a row wins.
 * If a column shows "—" on every row, its real key isn't listed yet.
 */
export const COLUMNS = [
  { label: "Lead Id", keys: ["lead_id", "leadId"], type: "lead" },
  { label: "Loan No", keys: ["loan_no", "loanNo", "loan_id"], type: "loan" },
  { label: "Employee Name", keys: ["employee_name", "employeeName", "emp_name", "agent_name"] },
  { label: "Disposition Code", keys: ["disposition_code", "dispositionCode"], type: "code" },
  { label: "Disposition Label", keys: ["disposition_label", "dispositionLabel"], type: "dispositionBadge" },
  { label: "Display", keys: ["display", "display_name", "displayName"] },
  { label: "Ptp Amount", keys: ["ptp_amount", "ptpAmount"], type: "inr" },
  { label: "Ptp Date", keys: ["ptp_date", "ptpDate"], type: "date" },
  { label: "Ptp Type", keys: ["ptp_type", "ptpType"], type: "badge" },
  { label: "Remarks", keys: ["remarks", "remark", "comment"], type: "wrap" },
  { label: "Created At", keys: ["created_at", "createdAt", "created_on"], type: "datetime" },
];

export function pick(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

const dash = <span className="text-gray-300">—</span>;

function fmtInr(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(v, withTime = false) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default function DispositionTable({ rows, startIndex = 0, hideCodeColumns = false }) {
  const cols = hideCodeColumns
    ? COLUMNS.filter((c) => c.type !== "code" && c.label !== "Disposition Label")
    : COLUMNS;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="th">#</th>
            {cols.map((col) => (
              <th key={col.label} className="th whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const leadId = pick(row, ["lead_id", "leadId"]);
            const dispCode = pick(row, ["disposition_code", "dispositionCode"]);
            return (
              <tr
                key={i}
                className={`border-b border-line transition last:border-0 hover:bg-accent-light/25 ${
                  i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white"
                }`}
              >
                <td className="td text-xs text-gray-400">{startIndex + i + 1}</td>
                {cols.map((col) => {
                  const val = pick(row, col.keys);
                  let content;

                  if (val === null) {
                    content = dash;
                  } else if ((col.type === "lead" || col.type === "loan") && leadId) {
                    content = (
                      <Link
                        href={`/customer-one-pager?lead_id=${encodeURIComponent(leadId)}`}
                        className="badge bg-accent-light font-bold text-accent-dark no-underline transition hover:bg-accent hover:text-white"
                      >
                        {String(val)}
                      </Link>
                    );
                  } else if (col.type === "inr") {
                    content = <span className="font-semibold tabular-nums">{fmtInr(val)}</span>;
                  } else if (col.type === "date") {
                    content = fmtDate(val);
                  } else if (col.type === "datetime") {
                    content = <span className="text-xs text-gray-500">{fmtDate(val, true)}</span>;
                  } else if (col.type === "badge") {
                    content = <span className="badge bg-accent-light text-accent-dark">{String(val)}</span>;
                  } else if (col.type === "dispositionBadge") {
                    const tone = toneForCode(dispCode || val);
                    content = (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: tone.bg, color: tone.text }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.dot }} />
                        {String(val)}
                      </span>
                    );
                  } else if (col.type === "code") {
                    content = (
                      <span className="font-mono text-xs font-semibold text-gray-700">{String(val)}</span>
                    );
                  } else {
                    content = String(val);
                  }

                  return (
                    <td
                      key={col.label}
                      className={`td ${
                        col.type === "wrap"
                          ? "min-w-[220px] max-w-[320px] !whitespace-normal text-xs text-gray-600"
                          : "whitespace-nowrap"
                      }`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
