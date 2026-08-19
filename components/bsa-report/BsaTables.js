"use client";

import { useMemo, useState } from "react";
import { inr, ms2d, n, sv } from "@/lib/bsaHelpers";

/** Monthly Analysis — one row per statement month + a highlighted Grand Total row. */
export function MonthlyAnalysisTable({ analysisData }) {
  return (
    <div className="card mb-5">
      <div className="border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Monthly Analysis
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface text-left text-gray-500">
              {["Month", "Salary", "Cr Txns", "Dr Txns", "Gross Credit", "Gross Debit", "Net Credit", "Avg EOD", "Max EOD", "Min EOD", "EMI Bounces", "Pay Bounce Chg", "Loan Disbursal", "Cash Dep", "Bank Charges", "NEFT Cr", "IMPS Cr"].map(
                (h, i) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {analysisData.map((ar, i) => {
              const isGrand = (ar.month ?? "") === "Grand Total";
              return (
                <tr key={i} className={`border-t border-line ${isGrand ? "bg-accent-light font-bold text-accent-dark" : "text-gray-700"}`}>
                  <td className="whitespace-nowrap px-3 py-2">{sv(ar.month)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.salaryAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{n(ar.noOfCreditTransactions)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{n(ar.noOfDebitTransactions)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-[#0f9b8e]">{inr(ar.creditTransactionsAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-danger">{inr(ar.debitTransactionsAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.netCreditTransactionsAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.averageEODBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.maximumEODBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.minimumEODBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{n(ar.noOfEMIBounceCharges)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-danger">{inr(ar.totalPaymentBounceCharges)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.loanDisbursalAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{inr(ar.cashDepositsAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-danger">{inr(ar.totalBankChargesAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-[#0f9b8e]">{inr(ar.totalNEFTCreditAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-[#0f9b8e]">{inr(ar.totalIMPSCreditAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Bounce Analysis table — flattens chequeBounces[].transactions[]. */
export function BounceAnalysisTable({ bounceMths, totalBounceEvents, inRet, outRet, inwardReturnAmount }) {
  const rows = [];
  bounceMths.forEach((bm) => (bm.transactions ?? []).forEach((bt) => rows.push({ month: bm.month, ...bt })));
  return (
    <div className="card mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Bounce Analysis
        </span>
        <span className="text-xs text-gray-500">
          Total events: <strong className="text-gray-800">{totalBounceEvents}</strong> · Inward: <strong className="text-gray-800">{inRet}</strong> · Outward:{" "}
          <strong className="text-gray-800">{outRet}</strong> · Total charges: <strong className="text-gray-800">{inr(inwardReturnAmount)}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface text-left text-gray-500">
              {["Month", "Category", "Amount", "Mode", "Date", "Narration"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-7 text-center text-gray-400">
                  No bounce events recorded
                </td>
              </tr>
            ) : (
              rows.map((bt, i) => (
                <tr key={i} className="border-t border-line text-gray-700">
                  <td className="whitespace-nowrap px-3 py-2">{sv(bt.month)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sv(bt.paymentCategory)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-danger">{inr(bt.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sv(bt.paymentMode)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{ms2d(bt.transactionDate)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-gray-500" title={bt.narration}>
                    {sv(bt.narration)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Fund Received / Fund Remitted — two stacked monthly totals lists side by side. */
export function FundFlowGrid({ fundReceived, fundRemittance }) {
  const Block = ({ title, icon, rows, tone }) => (
    <div className="card">
      <div className="border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
            {icon}
          </svg>
          {title}
        </span>
      </div>
      <div className="grid grid-cols-2">
        {(rows ?? []).map((r, i) => (
          <div key={i} className={`flex items-center justify-between border-b border-r border-line px-4 py-2 text-[13px] ${i % 2 === 1 ? "border-r-0" : ""}`}>
            <span className="text-gray-500">{sv(r.month)}</span>
            <span className={`font-bold ${tone === "cr" ? "text-[#0f9b8e]" : "text-danger"}`}>{inr(r.totalAmount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Block
        title="Fund Received (Monthly)"
        icon={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>}
        rows={fundReceived}
        tone="cr"
      />
      <Block
        title="Fund Remitted (Monthly)"
        icon={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>}
        rows={fundRemittance}
        tone="dr"
      />
    </div>
  );
}

/** Recurring Income / Expense patterns. */
export function RecurringPatterns({ recurIncome, recurExpense }) {
  if (!recurIncome.length && !recurExpense.length) return null;
  const Block = ({ title, data, clr }) =>
    data.length ? (
      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {title}
          </span>
          <span className="text-xs text-gray-400">{data.length} pattern(s)</span>
        </div>
        {data.map((ri, i) => {
          const txns = ri.recurringTransaction ?? [];
          return (
            <div key={i} className="border-b border-line px-5 py-2.5 last:border-0">
              <div className="mb-1 text-[13px] font-bold text-gray-800">
                {sv(txns[0]?.name, "Unknown")} · avg {inr(txns[0]?.amount)} · {txns.length} occurrences
              </div>
              <div className="flex flex-wrap gap-1">
                {txns.map((t, j) => (
                  <span key={j} className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: clr }}>
                    {sv(t.monthYear)} {inr(t.amount)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Block title="Recurring Income" data={recurIncome} clr="#0f9b8e" />
      <Block title="Recurring Expenses" data={recurExpense} clr="#c0392b" />
    </div>
  );
}

/** All Transactions — searchable, sortable-by-nothing flat table with client-side CSV export. */
export function AllTransactionsTable({ leadId, transactions }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return transactions;
    const needle = q.toLowerCase();
    return transactions.filter((tx) =>
      [tx.name, tx.paymentCategory, tx.paymentMode, tx.narration, tx.monthYear, tx.type].some((f) => String(f ?? "").toLowerCase().includes(needle))
    );
  }, [q, transactions]);

  function exportCSV() {
    const headers = ["#", "Date", "Month", "Type", "Name", "Category", "Mode", "Amount", "Opening Bal", "Closing Bal", "Narration"];
    const csvRows = [headers];
    filtered.forEach((tx, i) => {
      csvRows.push([
        i + 1,
        ms2d(tx.transactionDate),
        tx.monthYear ?? "",
        tx.type ?? "",
        tx.name ?? "",
        tx.paymentCategory ?? "",
        tx.paymentMode ?? "",
        tx.amount ?? "",
        tx.openingBalance ?? "",
        tx.closingBalance ?? "",
        tx.narration ?? "",
      ]);
    });
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bsa_lead_${leadId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          All Transactions ({filtered.length}
          {filtered.length !== transactions.length ? ` / ${transactions.length}` : ""})
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transactions…"
            className="w-44 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs outline-none focus:border-accent"
          />
          <button type="button" onClick={exportCSV} className="btn-secondary !px-2.5 !py-1 text-xs">
            Export CSV
          </button>
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface text-left text-gray-500">
              {["#", "Date", "Month", "Type", "Name", "Category", "Mode", "Amount", "Opening Bal", "Closing Bal", "Flags", "Narration"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-7 text-center text-gray-400">
                  No transactions match your search.
                </td>
              </tr>
            ) : (
              filtered.map((tx, i) => {
                const isCr = String(tx.type ?? "").toLowerCase() === "cr";
                return (
                  <tr key={i} className="border-t border-line text-gray-700 hover:bg-surface">
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{ms2d(tx.transactionDate)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{sv(tx.monthYear)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <span className={`badge ${isCr ? "bg-[#e8f5f0] text-[#0f9b8e]" : "bg-[#fdecea] text-danger"}`}>{sv(tx.type)}</span>
                    </td>
                    <td className="max-w-[110px] truncate px-3 py-1.5 font-semibold" title={tx.name}>
                      {sv(tx.name)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{sv(tx.paymentCategory)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{sv(tx.paymentMode)}</td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-bold ${isCr ? "text-[#0f9b8e]" : "text-danger"}`}>{inr(tx.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-500">{inr(tx.openingBalance)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-500">{inr(tx.closingBalance)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      {tx.ignorableTransaction ? <span className="badge mr-1 bg-surface text-gray-500">IGN</span> : null}
                      {tx.holiday ? <span className="badge bg-[#fff3e0] text-[#e65100]">HOL</span> : null}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-1.5 text-gray-500" title={tx.narration}>
                      {sv(tx.narration)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
