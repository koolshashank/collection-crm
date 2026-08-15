"use client";

import { lhInr, lhFmtDate } from "./leadUtils";
import { lhStatusCls, deriveLoanFinancials } from "./LoanHistoryModal";

function monthLabel(d) {
  if (!d) return "--";
  try {
    return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch { return "--"; }
}

/* ── Repayment Pattern tab (lhBuildRepayment) — verbatim columns & maths ── */
const REPAY_COLS = ["Cases", "Month", "Loan No.", "Loan Status", "Repayment Amount", "Amount Received",
  "Disbursal Date", "Repay Due Date", "Final Payment Date", "Delay (Days)",
  "Est. Principal", "Est. Interest", "Penal Charges (2%)", "Outstanding"];

export default function LoanHistoryRepayment({ d, openBreak, setOpenBreak }) {
  const loansAsc = d.loans.slice();
  const loans = d.loans.slice().reverse();
  const firstLoanId = loansAsc.length ? loansAsc[0].loan_id : null;

  return (
    <div className="m-5 overflow-hidden rounded-2xl border border-line shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-navy-light to-navy">
              {REPAY_COLS.map((c, ci) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-white/70 ${ci < 4 ? "text-left" : "text-right"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loans.map((l, idx) => {
              const { delayDays, repayAmt, recvTotal, penalty, principal, interest, outstanding } = deriveLoanFinancials(l);
              const isFresh = l.loan_id === firstLoanId;
              const open = Boolean(openBreak[idx]);
              return (
                <TableRowGroup key={idx}>
                  <tr
                    className={`cursor-pointer border-b border-line/70 transition hover:bg-amber/5 ${idx % 2 === 0 ? "bg-panel" : "bg-surface"} ${open ? "bg-amber/10" : ""}`}
                    onClick={() => setOpenBreak((o) => ({ ...o, [idx]: !o[idx] }))}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`badge border ${isFresh ? "bg-accent-light text-accent-dark border-accent/40" : "bg-blue-50 text-info border-info/40"}`}>
                        {isFresh ? "Fresh" : "Reloan"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-800">{monthLabel(l.disbursal_date)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent-dark">{l.loan_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`badge border ${lhStatusCls(l.status)}`}>
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                        {l.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-accent-dark">{lhInr(repayAmt)}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${recvTotal > 0 ? "text-accent-dark" : "text-gray-400"}`}>
                      {recvTotal > 0 ? lhInr(recvTotal) : "0"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{lhFmtDate(l.disbursal_date)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{lhFmtDate(l.repayment_date)}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 ${l.final_pay_date ? "text-gray-500" : "text-amber"}`}>
                      {l.final_pay_date ? lhFmtDate(l.final_pay_date) : l.is_current ? "Pending" : "--"}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${delayDays > 0 ? "text-danger" : "text-accent-dark"}`}>
                      {delayDays > 0 ? `${delayDays} day(s)` : "No Delay"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-info">{lhInr(principal)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-amber">{lhInr(interest)}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right ${penalty > 0 ? "text-danger" : "text-gray-400"}`}>
                      {penalty > 0 ? lhInr(penalty) : "0"}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${outstanding > 0 ? "text-danger" : "text-accent-dark"}`}>
                      {lhInr(outstanding)}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={14} className="bg-surface p-0">
                        <Breakdown l={l} />
                      </td>
                    </tr>
                  )}
                </TableRowGroup>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableRowGroup({ children }) {
  return <>{children}</>;
}

/* lhBuildBreakdownHtml — verbatim maths */
function Breakdown({ l }) {
  const { repayAmt, recvTotal, penalty, principal, interest } = deriveLoanFinancials(l);
  const isSettled = l.status === "Settled";
  const isPaid = recvTotal >= repayAmt;
  const recvPrinc = isPaid ? principal : Math.min(recvTotal, principal);
  const recvInterest = isPaid ? interest : Math.max(0, recvTotal - principal);
  const recvPenalty = isPaid ? penalty : 0;
  const discount = isSettled ? Math.round(penalty * 0.5) : 0;

  const outInterest = interest - recvInterest;
  const outPrinc = principal - recvPrinc;
  const outPenalty = Math.max(0, penalty - recvPenalty - discount);

  const rows = [
    { lbl: "Interest Amount", dot: "#e8a33d", pay: interest, recv: recvInterest, disc: 0, out: outInterest, clr: "text-amber" },
    { lbl: "Principal Amount", dot: "#3b6ea5", pay: principal, recv: recvPrinc, disc: 0, out: outPrinc, clr: "text-info" },
    { lbl: "Penalty Amount", dot: "#d64545", pay: penalty, recv: recvPenalty, disc: discount, out: outPenalty, clr: "text-accent-dark" },
  ];

  const totalPay = interest + principal + penalty;
  const totalRecv = recvInterest + recvPrinc + recvPenalty;
  const totalDisc = discount;
  const totalOut = Math.max(0, outInterest + outPrinc + outPenalty);

  return (
    <div className="border-t-2 border-amber px-5 py-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500" />
            {["Payable Amount", "Received Amount", "Discount Amount", "Outstanding"].map((c) => (
              <th key={c} className="px-2.5 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lbl} className="border-b border-line/60">
              <td className="px-2.5 py-2">
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: r.dot }} />
                <span className="font-semibold text-gray-800">{r.lbl}</span>
              </td>
              <td className="px-2.5 py-2 text-right font-semibold text-gray-800">{lhInr(r.pay)}</td>
              <td className={`px-2.5 py-2 text-right font-semibold ${r.recv > 0 ? "text-accent-dark" : "text-gray-400"}`}>
                {r.recv > 0 ? lhInr(r.recv) : "0"}
              </td>
              <td className={`px-2.5 py-2 text-right font-semibold ${r.disc > 0 ? "text-info" : "text-gray-400"}`}>
                {r.disc > 0 ? lhInr(r.disc) : "0"}
              </td>
              <td className={`px-2.5 py-2 text-right font-bold ${r.out > 0 ? r.clr : "text-accent-dark"}`}>
                {lhInr(Math.max(0, r.out))}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-amber bg-amber/10">
            <td className="px-2.5 py-2.5 font-bold text-amber">Grand Total</td>
            <td className="px-2.5 py-2.5 text-right font-bold text-amber">{lhInr(totalPay)}</td>
            <td className={`px-2.5 py-2.5 text-right font-bold ${totalRecv > 0 ? "text-accent-dark" : "text-gray-400"}`}>
              {totalRecv > 0 ? lhInr(totalRecv) : "0"}
            </td>
            <td className={`px-2.5 py-2.5 text-right font-bold ${totalDisc > 0 ? "text-info" : "text-gray-400"}`}>
              {totalDisc > 0 ? lhInr(totalDisc) : "0"}
            </td>
            <td className={`px-2.5 py-2.5 text-right font-bold ${totalOut > 0 ? "text-danger" : "text-accent-dark"}`}>
              {lhInr(totalOut)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
