"use client";

import Link from "next/link";

const PRIORITY_TONES = {
  urgent: "border-danger/40 bg-[#fbeaea] text-[#9c2b2b]",
  high: "border-amber/40 bg-[#fdf3e3] text-[#8a5a12]",
  normal: "border-line bg-surface text-gray-600",
  low: "border-line bg-surface text-gray-400",
};

const STATUS_TONES = {
  pending: "border-amber/40 bg-[#fdf3e3] text-[#8a5a12]",
  completed: "border-accent/40 bg-accent-light text-accent-dark",
  cancelled: "border-danger/40 bg-[#fbeaea] text-[#9c2b2b]",
};

function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const dash = <span className="text-gray-300">—</span>;

export default function FieldVisitTable({ rows, startIndex = 0 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="th">#</th>
            <th className="th">Lead ID</th>
            <th className="th">Loan ID</th>
            <th className="th">Customer</th>
            <th className="th">Mobile</th>
            <th className="th">Agent</th>
            <th className="th">Visit Date</th>
            <th className="th">Priority</th>
            <th className="th">Status</th>
            <th className="th">Notes</th>
            <th className="th">Assigned By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`border-b border-line transition last:border-0 hover:bg-accent-light/25 ${
                i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white"
              }`}
            >
              <td className="td text-xs text-gray-400">{startIndex + i + 1}</td>

              <td className="td whitespace-nowrap">
                {row.lead_id ? (
                  <Link
                    href={`/customer-one-pager?lead_id=${encodeURIComponent(row.lead_id)}`}
                    className="badge bg-accent-light font-bold text-accent-dark no-underline transition hover:bg-accent hover:text-white"
                  >
                    {row.lead_id}
                  </Link>
                ) : (
                  dash
                )}
              </td>

              <td className="td whitespace-nowrap text-gray-700">{row.loan_id || dash}</td>

              <td className="td whitespace-nowrap">
                <span className="font-semibold text-gray-800">{row.customer_name || dash}</span>
                {row.address ? (
                  <span className="block max-w-[240px] truncate text-[11px] text-gray-400">{row.address}</span>
                ) : null}
              </td>

              <td className="td whitespace-nowrap text-gray-600">{row.mobile || dash}</td>

              <td className="td whitespace-nowrap">
                {row.agent_name ? (
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-light text-[10px] font-bold text-accent-dark">
                      {String(row.agent_name).trim().substring(0, 1).toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-gray-800">{row.agent_name}</span>
                  </span>
                ) : (
                  dash
                )}
              </td>

              <td className="td whitespace-nowrap text-xs text-gray-600">{fmtDate(row.visit_date) || dash}</td>

              <td className="td whitespace-nowrap">
                <span className={`badge border capitalize ${PRIORITY_TONES[row.priority] || PRIORITY_TONES.normal}`}>
                  {row.priority || "normal"}
                </span>
              </td>

              <td className="td whitespace-nowrap">
                <span className={`badge border capitalize ${STATUS_TONES[row.status] || STATUS_TONES.pending}`}>
                  {row.status || "pending"}
                </span>
              </td>

              <td className="td min-w-[200px] max-w-[300px] !whitespace-normal text-xs text-gray-600">
                {row.notes || dash}
              </td>

              <td className="td whitespace-nowrap text-xs text-gray-500">{row.assigned_by || dash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
