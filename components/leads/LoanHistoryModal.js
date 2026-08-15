"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { lhInr, lhFmtDate } from "./leadUtils";
import LoanHistoryRepayment from "./LoanHistoryRepayment";

/* lhNormalise — verbatim port from lead.php */
function normalise(api) {
  const beh = api.behaviour || {};
  const summ = beh.summary || {};
  const loans = (api.loans || []).map((l) => {
    let statusLabel;
    if (l.is_current_loan && !l.final_payment_date) {
      statusLabel = l.repayment_status === "pending" ? "Active / Pending" : l.repayment_status || "Active";
    } else if (l.repayment_status === "delayed" || l.is_delayed) {
      statusLabel = "Delayed";
    } else if (l.repayment_status === "on_time" || l.repayment_status === "ontime") {
      statusLabel = "Recovered";
    } else if (l.repayment_status === "early") {
      statusLabel = "Recovered";
    } else {
      statusLabel = l.repayment_status
        ? l.repayment_status.charAt(0).toUpperCase() + l.repayment_status.slice(1)
        : "Unknown";
    }

    let dot;
    if (!l.final_payment_date) dot = "pending";
    else if (l.is_delayed) dot = "late";
    else dot = "ontime";

    return {
      loan_id: l.loan_no,
      lead_id: l.lead_id,
      loan_sequence: l.loan_sequence,
      loan_type: l.is_reloan ? "Reloan" : "Fresh Loan",
      sanction_amt: l.repayment_amount || 0,
      emi: l.repayment_amount || 0,
      tenure: null,
      disbursal_date: l.disbursal_date || l.sanction_date,
      repayment_date: l.repayment_date,
      final_pay_date: l.final_payment_date,
      received_amt: l.total_received_amount || 0,
      days_from_due: l.days_from_due,
      status: statusLabel,
      repay_status: l.repayment_status,
      is_delayed: l.is_delayed,
      is_current: l.is_current_loan,
      repay_hist: [dot],
      pan: api.pan || "--",
      agent: "--",
      dpd: l.days_from_due || 0,
      remarks: l.is_current_loan
        ? "Current active loan"
        : l.is_delayed
        ? "Payment was delayed by " + (l.days_from_due || "?") + " day(s)"
        : "Repaid on time",
    };
  });

  const totalAmt = loans.reduce((s, l) => s + l.sanction_amt, 0);
  const repaidCount = loans.filter((l) => l.final_pay_date).length;
  const totalComp = summ.total_completed_loans || 0;
  const delayRate = summ.delay_rate || 0;
  const score = totalComp > 0 ? Math.round((1 - delayRate) * 100) : 100;

  return {
    loans,
    total_count: api.total_loans || loans.length,
    total_amt: totalAmt,
    repaid_count: repaidCount,
    score,
    since: loans.length ? loans[0].disbursal_date : "",
    pan: api.pan || "--",
    behaviour: beh.category_label || beh.category || "Unknown",
    on_time: summ.on_time_count || 0,
    delayed: summ.delayed_count || 0,
    beh_category: beh.category || "",
    last_delayed: summ.last_repayment_delayed || false,
  };
}

/* lhStatusMeta — same buckets, design-system classes */
export function lhStatusCls(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("recovered") && !v.includes("not")) return "bg-accent-light text-accent-dark border-accent/40";
  if (v.includes("not recovered")) return "bg-red-50 text-danger border-red-200";
  if (v.includes("settled")) return "bg-blue-50 text-info border-info/40";
  if (v.includes("part")) return "bg-amber/10 text-amber border-amber/40";
  if (v.includes("active")) return "bg-amber/10 text-amber border-amber";
  return "bg-gray-100 text-gray-500 border-line";
}

/* Financial derivations — verbatim maths from lhBuildRepayment / lhBuildBreakdownHtml */
export function deriveLoanFinancials(l) {
  const delayDays = l.days_from_due || 0;
  const repayAmt = l.sanction_amt;
  const recvTotal = l.received_amt || 0;
  const penalty = l.is_delayed && delayDays > 0 ? Math.round(repayAmt * 0.02 * Math.ceil(delayDays / 30)) : 0;
  const principal = Math.round(repayAmt * 0.85);
  const interest = repayAmt - principal;
  const outstanding = Math.max(0, principal + interest + penalty - recvTotal);
  return { delayDays, repayAmt, recvTotal, penalty, principal, interest, outstanding };
}

export default function LoanHistoryModal({ lead, onClose }) {
  const [tab, setTab] = useState("loans");
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [openBreak, setOpenBreak] = useState({});

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch(`/api/leads/loan-history?loan_id=${encodeURIComponent(lead.loanId)}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!alive) return;
      if (!res.data?.success || !res.data?.data) {
        setState({ loading: false, error: res.data?.message || res.error || "API error", data: null });
      } else {
        setState({ loading: false, error: null, data: normalise(res.data.data) });
      }
    })();
    return () => { alive = false; };
  }, [lead.loanId]);

  const d = state.data;
  const behClr = d?.beh_category === "good" ? "#0f9b8e" : d?.beh_category === "bad" ? "#d64545" : "#e8a33d";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-panel shadow-pop">
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy px-6 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-xl font-bold text-white">{lead.name || "--"}</p>
              <p className="mt-1 text-xs text-white/60">
                {state.loading || !d ? (
                  <>{(lead.isReloan ? "Reloan Customer" : "Fresh Customer") + "  |  " + lead.loanId}</>
                ) : (
                  <>
                    {lead.isReloan ? "Reloan Customer" : "Fresh Customer"}
                    <span className="mx-2 text-white/40">|</span>
                    PAN: <strong className="tracking-widest text-white/85">{d.pan}</strong>
                    <span className="mx-2 text-white/40">|</span>
                    Behaviour:{" "}
                    <strong className="rounded px-1.5 py-0.5 text-[11px]" style={{ color: behClr, background: behClr + "22" }}>
                      {d.behaviour}
                    </strong>
                    {d.last_delayed && (
                      <span className="ml-1.5 rounded bg-danger/20 px-1.5 py-0.5 text-[10px] text-red-300">Last Delayed</span>
                    )}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/25"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-6 border-t border-white/10 pt-3.5">
            <Stat label="Total Loans" gold value={d ? d.total_count : "--"} />
            <Stat label="Total Borrowed" value={d ? lhInr(d.total_amt) : "--"} />
            <Stat label="Fully Repaid" value={d ? `${d.repaid_count} / ${d.total_count}` : "--"} />
            <Stat label="Repayment Score" value={d ? `${d.score}%` : "--"} />
            <Stat label="Customer Since" value={d ? lhFmtDate(d.since) : "--"} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-line bg-surface px-6">
          {[["loans", "All Loans"], ["repayment", "Repayment Pattern"], ["timeline", "Activity Timeline"]].map(([t, label]) => (
            <button
              key={t}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                tab === t ? "border-accent text-accent-dark" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {state.loading ? (
            <div className="flex flex-col items-center gap-3 py-14 text-xs text-gray-400">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent-light border-t-accent" />
              Loading loan history...
            </div>
          ) : state.error ? (
            <div className="px-5 py-12 text-center">
              <p className="mb-1 text-sm font-semibold text-danger">Failed to load history</p>
              <p className="text-xs text-gray-400">{String(state.error)}</p>
            </div>
          ) : tab === "loans" ? (
            <LoansTab d={d} />
          ) : tab === "repayment" ? (
            <LoanHistoryRepayment d={d} openBreak={openBreak} setOpenBreak={setOpenBreak} />
          ) : (
            <TimelineTab d={d} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-0.5 font-display text-base font-bold ${gold ? "text-amber" : "text-white"}`}>{value}</p>
    </div>
  );
}

/* ── All Loans tab (lhBuildLoans) ───────────────────────────────────────── */
function LoansTab({ d }) {
  const loans = d.loans.slice().reverse();
  if (!loans.length) {
    return <div className="py-12 text-center text-xs text-gray-400">No loan history found</div>;
  }
  return (
    <div className="pb-4">
      {loans.map((l, idx) => {
        const delayLabel = l.days_from_due ? l.days_from_due + " day(s) late" : "No Delay";
        const cells = [
          ["Repayment Amount", lhInr(l.sanction_amt), "text-info"],
          ["Amount Received", l.received_amt > 0 ? lhInr(l.received_amt) : "0", l.received_amt > 0 ? "text-accent-dark" : ""],
          ["Disbursal Date", lhFmtDate(l.disbursal_date), ""],
          ["Repayment Date", lhFmtDate(l.repayment_date), ""],
          ["Final Payment Date", l.final_pay_date ? lhFmtDate(l.final_pay_date) : l.is_current ? "Pending" : "--", l.final_pay_date ? "" : l.is_current ? "text-amber" : ""],
          ["Delay", l.is_current ? "--" : delayLabel, l.is_current ? "" : l.is_delayed ? "text-danger" : "text-accent-dark"],
          ["PAN", l.pan, ""],
          ["Remarks", l.remarks, ""],
        ];
        return (
          <div key={idx} className={`mx-5 mt-4 overflow-hidden rounded-2xl border transition hover:shadow-card ${l.is_current ? "border-amber" : "border-line"}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3">
              {l.is_current && (
                <span className="shrink-0 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold uppercase text-white">Current</span>
              )}
              <span className="rounded bg-accent-light px-2.5 py-0.5 font-display text-sm font-bold text-accent-dark">{l.loan_id}</span>
              <span className={`badge border ${l.loan_type.includes("Business") ? "bg-blue-50 text-info" : "bg-purple-50 text-purple-600"}`}>
                {l.loan_type}
              </span>
              <span className="text-xs text-gray-500">Disbursed: {lhFmtDate(l.disbursal_date)}</span>
              <span className="ml-auto text-xs text-gray-500">Agent: {l.agent}</span>
              <span className={`badge border ${lhStatusCls(l.status)}`}>
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                {l.status}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {cells.map((c, ci) => (
                <div key={ci} className="border-b border-r border-line/60 px-4 py-3 last:border-r-0 [&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+4)]:border-b-0">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{c[0]}</p>
                  <p className={`text-sm font-semibold text-gray-800 ${c[2]}`}>{String(c[1])}</p>
                </div>
              ))}
            </div>
            {l.repay_hist?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 border-t border-line/60 px-4 py-3">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Repayment:</span>
                {l.repay_hist.map((r, mi) => {
                  const dotClr = r === "ontime" ? "#0f9b8e" : r === "partial" ? "#e8a33d" : "#d64545";
                  const dotLbl = r === "ontime" ? "On Time" : r === "partial" ? "Partial" : "Late/Missed";
                  return (
                    <span
                      key={mi}
                      className="h-4 w-4 cursor-pointer rounded-full transition hover:scale-125"
                      style={{ background: dotClr }}
                      title={`Month ${mi + 1}: ${dotLbl}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Activity Timeline tab (lhBuildTimeline) — same synthesized events ─── */
function TimelineTab({ d }) {
  const events = [];
  d.loans.slice().reverse().forEach((l) => {
    events.push({
      type: "Loan Disbursed",
      date: l.disbursal_date,
      desc: "Loan " + l.loan_id + " of " + lhInr(l.sanction_amt) + " disbursed. Type: " + l.loan_type,
      color: "#e8a33d",
    });
    if (l.status === "Recovered") {
      events.push({ type: "Loan Recovered", date: "", desc: "Loan " + l.loan_id + " fully recovered. Case closed.", color: "#0f9b8e" });
    } else if (l.status === "Settled") {
      events.push({ type: "Settled", date: "", desc: "Loan " + l.loan_id + " settled at a discounted amount.", color: "#3b6ea5" });
    } else if (l.status === "Not Recovered") {
      events.push({ type: "Recovery Pending", date: "", desc: "Loan " + l.loan_id + " outstanding. Recovery in progress.", color: "#d64545" });
    } else if (l.status === "Part Payment") {
      events.push({ type: "Part Payment", date: "", desc: "Partial recovery received for loan " + l.loan_id + ".", color: "#e8a33d" });
    }
  });

  if (!events.length) {
    return <div className="py-12 text-center text-xs text-gray-400">No timeline data</div>;
  }
  return (
    <div className="py-2">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3 border-b border-line/60 px-5 py-3 last:border-0">
          <div className="flex flex-col items-center pt-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ev.color }} />
            {i !== events.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-line" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-800">{ev.type}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{ev.desc}</p>
            {ev.date && <p className="mt-1 text-[11px] text-gray-400">{lhFmtDate(ev.date)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
