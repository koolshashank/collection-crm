"use client";

import { inr, ms2d, sv } from "@/lib/bsaHelpers";

const TONE = {
  ok: { bg: "bg-[#f0faf4]", border: "border-[#b2dfcc]", icon: "bg-[#d4edda]", clr: "#0f9b8e" },
  amber: { bg: "bg-[#fff9f0]", border: "border-[#fcd9a0]", icon: "bg-[#fef3dc]", clr: "#b7770d" },
  red: { bg: "bg-[#fdf2f2]", border: "border-[#f5c6c6]", icon: "bg-[#fdecea]", clr: "#c0392b" },
};

function RiskCard({ tone, title, detail, icon }) {
  const t = TONE[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${t.bg} ${t.border}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke={t.clr} strokeWidth="2" width="13" height="13">
          {icon}
        </svg>
      </div>
      <div>
        <div className="text-[13px] font-bold text-gray-800">{title}</div>
        <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
      </div>
    </div>
  );
}

/** Risk Indicators grid — mirrors bsa.php's .rg risk cards (bounce, balance, returns, disbursals, fraud). */
export function RiskIndicators({ totalBounceEvents, cam, grandRow, inRet, outRet, fraudHits }) {
  const avgBal6m = Number(cam?.averageBalanceLastSixMonth ?? 0);
  const loanDisb = Number(grandRow?.loanDisbursalAmount ?? 0);

  const risks = [
    {
      tone: totalBounceEvents === 0 ? "ok" : totalBounceEvents <= 3 ? "amber" : "red",
      icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
      title: totalBounceEvents === 0 ? "No Bounce Events" : `Bounce Events: ${totalBounceEvents}`,
      detail: totalBounceEvents === 0 ? "Clean history — no EMI or payment bounces." : "Bounce events detected. Review bounce table below.",
    },
    {
      tone: avgBal6m >= 5000 ? "ok" : avgBal6m >= 200 ? "amber" : "red",
      icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
      title: `Avg EOD Balance (6M): ${inr(avgBal6m)}`,
      detail:
        avgBal6m >= 5000
          ? "Healthy end-of-day balance."
          : avgBal6m >= 200
          ? "Low average balance — limited buffer."
          : "Very low EOD balance — high stress.",
    },
    {
      tone: inRet === 0 ? "ok" : inRet <= 2 ? "amber" : "red",
      icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
      title: `Inward Returns: ${inRet}`,
      detail: inRet === 0 ? "No inward payment returns." : `${inr(cam?.inwardReturnAmount ?? 0)} returned inward.`,
    },
    {
      tone: outRet === 0 ? "ok" : outRet <= 3 ? "amber" : "red",
      icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
      title: `Outward Returns: ${outRet}`,
      detail: outRet === 0 ? "No outward payment failures." : `${inr(cam?.outwardReturnAmount ?? 0)} in outward returns.`,
    },
    {
      tone: loanDisb === 0 ? "ok" : "amber",
      icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
      title: `Loan Disbursals: ${inr(loanDisb)}`,
      detail: loanDisb === 0 ? "No loan disbursals detected." : `${grandRow?.noOfLoanDisbursal ?? 0} disbursals totalling ${inr(loanDisb)}.`,
    },
    {
      tone: fraudHits.length === 0 ? "ok" : "red",
      icon: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
      title: fraudHits.length === 0 ? "No Fraud Indicators" : `${fraudHits.length} Fraud Indicator(s)`,
      detail: fraudHits.length === 0 ? "All fraud checks passed." : "One or more indicators flagged — review below.",
    },
  ];

  return (
    <div className="card mb-5">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Risk Indicators
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2">
        {risks.map((r, i) => (
          <RiskCard key={i} tone={r.tone} icon={r.icon} title={r.title} detail={r.detail} />
        ))}
      </div>
    </div>
  );
}

/** Fraud indicator detail cards — mirrors bsa.php's .fi blocks. */
export function FraudIndicators({ fraudHits }) {
  if (!fraudHits.length) return null;
  return (
    <div className="card mb-5">
      <div className="flex items-center justify-between rounded-t-xl border-b border-line bg-[#fdf2f2] px-5 py-3">
        <span className="flex items-center gap-2 font-display text-[15px] text-[#c0392b]">
          <svg viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" width="15" height="15">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Fraud Indicators ({fraudHits.length} flagged)
        </span>
      </div>
      {fraudHits.map((fi, i) => (
        <div key={i} className="border-b border-line px-5 py-3 last:border-0">
          <div className="mb-0.5 text-[13px] font-bold text-[#c0392b]">⚠ {sv(fi.name)}</div>
          <div className="mb-2 text-xs text-gray-500">{sv(fi.description)}</div>
          <div className="space-y-1 rounded-lg bg-surface p-2.5 text-xs text-gray-700">
            {(fi.transactions ?? []).map((ft, j) => (
              <div key={j} className="flex flex-wrap items-center gap-2.5 border-b border-line py-1 last:border-0">
                <span className="text-[13px] font-bold text-gray-800">{ms2d(ft.transactionDate)}</span>
                <span className={`badge ${ft.type === "Cr" ? "bg-[#e8f5f0] text-[#0f9b8e]" : "bg-[#fdecea] text-danger"}`}>{sv(ft.type)}</span>
                <span className="font-bold" style={{ color: ft.type === "Cr" ? "#0f9b8e" : "#d64545" }}>
                  {inr(ft.amount)}
                </span>
                <span className="text-gray-700">{sv(ft.name)}</span>
                <span className="min-w-0 flex-1 truncate text-gray-500">{sv(ft.narration)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
