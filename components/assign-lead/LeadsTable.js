"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/Feedback";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { fmtInr, empId, empOptionLabel, leadKey } from "./format";

/**
 * Unassigned Loan Accounts table + pagination — mirror of assign_lead.php.
 * Columns, empty states and pagination behaviour (8-page sets) identical.
 */
export default function LeadsTable({
  leads,
  employees,
  currentPage,
  totalPages,
  total,
  limit,
  search,
  selected,
  rowStatus, // { [leadId]: "loading" | "done" }
  onToggle,
  onToggleAll,
  onSingleAssign,
  onGoToPage,
}) {
  const { error } = useToast();
  const [rowAgent, setRowAgent] = useState({}); // per-row selected agent

  const allChecked = leads.length > 0 && leads.every((r) => selected.has(String(leadKey(r))));

  // Pagination blocks — pagesPerSet = 8, same as PHP
  const pagesPerSet = 8;
  const currentSet = Math.max(1, Math.ceil(currentPage / pagesPerSet));
  const startPage = (currentSet - 1) * pagesPerSet + 1;
  const endPage = Math.min(startPage + pagesPerSet - 1, Math.max(1, totalPages));
  const pageNumbers = [];
  for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);

  function singleAssign(row) {
    const key = String(leadKey(row));
    const loanDisplay = row.loan_id || key;
    const agent = rowAgent[key] || "";
    if (!agent) {
      error("Please select an agent before assigning.");
      return;
    }
    const label = employees
      .map((e) => ({ id: String(empId(e)), label: empOptionLabel(e) }))
      .find((e) => e.id === agent)?.label;
    if (!window.confirm(`Assign loan ${loanDisplay} to ${label}?`)) return;
    onSingleAssign(key, agent);
  }

  return (
    <div className="card overflow-hidden">
      {/* Head */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
        <h3 className="font-display text-base font-semibold text-gray-800">Unassigned Loan Accounts</h3>
        {total > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>
              Showing{" "}
              <strong className="text-gray-800">
                {((currentPage - 1) * limit + 1).toLocaleString("en-IN")}–
                {Math.min(currentPage * limit, total).toLocaleString("en-IN")}
              </strong>{" "}
              of <strong className="text-gray-800">{total.toLocaleString("en-IN")}</strong>
            </span>
            <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-[11px] font-semibold text-accent-dark">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="py-6">
          <EmptyState
            icon="🔍"
            title={search ? "No Results Found" : "All Leads Assigned"}
            hint={
              search
                ? "No unassigned leads match your search. Try a different name, loan ID or mobile number."
                : "There are no unassigned active leads at the moment. Check back later or refresh the list."
            }
          />
          {search && (
            <div className="flex justify-center">
              <Link href="/assign-lead" className="btn-secondary">
                Clear Search
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="th w-10 text-center">
                    <input
                      type="checkbox"
                      title="Select all"
                      className="h-4 w-4 cursor-pointer accent-accent"
                      checked={allChecked}
                      onChange={(e) => onToggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="th">#</th>
                  <th className="th">Loan ID</th>
                  <th className="th">Borrower</th>
                  <th className="th">Mobile</th>
                  <th className="th">Sanction Amt</th>
                  <th className="th">Disbursal Date</th>
                  <th className="th">City / State</th>
                  <th className="th">Assign To Agent</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row, i) => {
                  const key = String(leadKey(row));
                  const serial = (currentPage - 1) * limit + i + 1;
                  const initials = String(row.full_name || "U").charAt(0).toUpperCase();
                  const status = rowStatus[key];
                  const isSelected = selected.has(key);
                  return (
                    <tr
                      key={key || i}
                      className={`border-b border-line transition last:border-0 hover:bg-accent-light/30 ${
                        isSelected ? "bg-accent-light/40" : ""
                      } ${status === "done" ? "opacity-[.45]" : ""}`}
                    >
                      <td className="td text-center">
                        <input
                          type="checkbox"
                          name="loan_ids[]"
                          value={key}
                          checked={isSelected}
                          disabled={status === "done"}
                          onChange={() => onToggle(key)}
                          className="h-4 w-4 cursor-pointer accent-accent"
                        />
                      </td>
                      <td className="td text-xs text-gray-400">{serial}</td>
                      <td className="td">
                        <span className="inline-block rounded-md bg-accent-light px-2 py-0.5 text-xs font-bold text-accent-dark">
                          {row.loan_id ?? "—"}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-light to-accent font-display text-xs font-bold text-white">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold leading-tight text-gray-800">
                              {row.full_name ?? "—"}
                            </div>
                            <div className="truncate text-[11px] text-gray-400">{row.email ?? row.mobile ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td text-gray-600">{row.mobile ?? "—"}</td>
                      <td className="td font-semibold text-gray-800">{fmtInr(row.sanction_amount ?? 0)}</td>
                      <td className="td text-xs text-gray-400">{row.disbursal_date_ist ?? "—"}</td>
                      <td className="td">
                        <div className="leading-tight">
                          <div className="text-sm">{row.city ?? "—"}</div>
                          <div className="text-[11px] text-gray-400">{row.state ?? "—"}</div>
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <select
                            className="input min-w-[160px] py-1.5 text-xs"
                            value={rowAgent[key] || ""}
                            disabled={status === "done"}
                            onChange={(e) => setRowAgent((m) => ({ ...m, [key]: e.target.value }))}
                          >
                            <option value="">— Select Agent —</option>
                            {employees.map((emp) => (
                              <option key={String(empId(emp))} value={String(empId(emp))}>
                                {empOptionLabel(emp)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            title="Assign this lead"
                            disabled={status === "loading" || status === "done"}
                            onClick={() => singleAssign(row)}
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
                              status === "done" ? "bg-emerald-700" : "bg-accent hover:bg-accent-dark"
                            } disabled:cursor-not-allowed`}
                          >
                            {status === "loading" ? (
                              <Spinner size={12} className="border-white border-t-transparent" />
                            ) : status === "done" ? (
                              "Done"
                            ) : (
                              "Assign"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line bg-surface px-5 py-3.5">
              <div className="text-xs text-gray-500">
                Page <strong className="text-gray-800">{currentPage}</strong> of{" "}
                <strong className="text-gray-800">{totalPages}</strong> &nbsp;·&nbsp;{" "}
                {total.toLocaleString("en-IN")} total records
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  title="Previous"
                  disabled={currentSet <= 1}
                  onClick={() => onGoToPage(startPage - 1)}
                  className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
                >
                  ‹
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onGoToPage(p)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] px-2 text-sm transition ${
                      p === currentPage
                        ? "border-accent bg-accent font-bold text-white"
                        : "border-line bg-white text-gray-600 hover:border-accent hover:bg-accent-light hover:text-accent-dark"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  title="Next"
                  disabled={endPage >= totalPages}
                  onClick={() => onGoToPage(endPage + 1)}
                  className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-gray-600 transition enabled:hover:border-accent enabled:hover:bg-accent-light enabled:hover:text-accent-dark disabled:pointer-events-none disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
