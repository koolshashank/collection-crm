"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { inr, n, parseBsaPayload, sv } from "@/lib/bsaHelpers";
import { AvgBalanceChart, BounceChart, CreditDebitChart } from "@/components/bsa-report/BsaCharts";
import { AllTransactionsTable, BounceAnalysisTable, FundFlowGrid, MonthlyAnalysisTable, RecurringPatterns } from "@/components/bsa-report/BsaTables";
import { FraudIndicators, RiskIndicators } from "@/components/bsa-report/BsaRiskFraud";

function SearchScreen({ onSearch }) {
  const [val, setVal] = useState("");
  return (
    <div className="mx-auto mt-14 max-w-md">
      <div className="card p-9 text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-accent-light">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="24" height="24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <h2 className="font-display text-lg text-gray-800">Bank Statement Analysis</h2>
        <p className="mb-5 mt-1.5 text-[13px] leading-relaxed text-gray-500">
          Enter a Lead ID to fetch the complete BSA report — income, bounces, monthly analysis, transactions &amp; fraud indicators.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (val.trim()) onSearch(val.trim());
          }}
        >
          <input
            type="text"
            autoFocus
            required
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Enter Lead ID (e.g. 24424)"
            className="input"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Fetch
          </button>
        </form>
      </div>
    </div>
  );
}

function ScoreRing({ score, fraudScore }) {
  const s = Number(score ?? 0);
  const clr = s >= 750 ? "#0f9b8e" : s >= 600 ? "#3b6ea5" : s >= 400 ? "#b7770d" : "#c0392b";
  const label = s >= 750 ? "Excellent" : s >= 600 ? "Good" : s >= 400 ? "Fair" : s === 0 ? "Not Scored" : "Poor";
  const offset = s > 0 ? Math.round(283 * (1 - s / 900)) : 283;
  return (
    <div className="flex flex-col items-center gap-2.5 p-5">
      <div className="relative h-[106px] w-[106px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e6f6f4" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={clr}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl font-bold" style={{ color: clr }}>
            {s > 0 ? s : "N/A"}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-gray-400">/ 900</div>
        </div>
      </div>
      <span className="rounded-full px-3.5 py-1 text-xs font-bold" style={{ background: clr + "22", color: clr }}>
        {label}
      </span>
      {fraudScore > 0 && <div className="text-xs font-bold text-danger">⚠ Fraud Score: {fraudScore}</div>}
    </div>
  );
}

function CamSummary({ cam }) {
  const rows = [
    ["Avg Balance (Overall)", inr(cam?.averageBalance), "#0f9b8e"],
    ["Avg Balance (6M)", inr(cam?.averageBalanceLastSixMonth), "#3b6ea5"],
    ["Avg Balance (3M)", inr(cam?.averageBalanceLastThreeMonth), "#3b6ea5"],
    ["Total Net Credits", inr(cam?.totalNetCredits), "#0f9b8e"],
    ["Avg Receipt (6M)", inr(cam?.averageReceiptLastSixMonth), "#0f9b8e"],
    ["Avg Receipt (12M)", inr(cam?.averageReceiptLastTwelveMonth), "#0f9b8e"],
    ["Inward Returns", `${n(cam?.inwardReturnCount)} · ${inr(cam?.inwardReturnAmount)}`, "#c0392b"],
    ["Outward Returns", `${n(cam?.outwardReturnCount)} · ${inr(cam?.outwardReturnAmount)}`, "#b7770d"],
    ["Salary Credits (6M)", n(cam?.salaryCreditCountLastSixMonth), "#0f9b8e"],
    ["Salary Credits (3M)", n(cam?.salaryCreditCountLastThreeMonth), "#0f9b8e"],
  ];
  return (
    <div className="px-5 py-1 pb-3">
      {rows.map(([l, v, c]) => (
        <div key={l} className="flex items-center justify-between border-b border-line py-2 text-[13px] last:border-0">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
            {l}
          </span>
          <span className="font-bold" style={{ color: c }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ value, label, sub, clr, bg, icon }) {
  return (
    <div className="card relative overflow-hidden p-4" style={{ borderLeft: `3px solid ${clr}` }}>
      <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: bg }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.8" width="14" height="14">
          {icon}
        </svg>
      </div>
      <div className="font-display text-xl font-bold" style={{ color: clr }}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

/**
 * BSA Report — React/Next port of the legacy bsa.php page.
 * Fetches the third-party BSA payload via /api/bsa?lead_id=… and renders
 * the same KPI/score/CAM/monthly/bounce/fraud/transactions sections.
 */
export default function BsaReportView({ leadId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!leadId);
  const [apiError, setApiError] = useState(null);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setApiError(null);
      const res = await clientFetch(`/api/bsa?lead_id=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      if (res.status === 401) {
        setApiError("Unauthorized — session may have expired.");
      } else if (res.status === 404) {
        setApiError(`No BSA data found for Lead #${leadId}.`);
      } else if (res.status === 0) {
        setApiError(res.error || "Connection error. Please try again.");
      } else if (!res.ok) {
        setApiError(`API returned HTTP ${res.status}.`);
      } else {
        setPayload(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (!leadId) return <SearchScreen onSearch={(id) => router.push(`/bsa-report?lead_id=${encodeURIComponent(id)}`)} />;
  if (loading) return <PageLoader label="Fetching BSA report…" />;

  const { root, grandRow, monthlyRows, salaryMonths, allTxns, bounceMths, cam, recurIncome, recurExpense, fraudHits, totalBounceEvents, charts } =
    parseBsaPayload(payload);

  const totalSalary = salaryMonths.reduce((s, sm) => s + Number(sm.totalSalary ?? 0), 0);
  const salCounted = salaryMonths.filter((sm) => Number(sm.totalSalary ?? 0) > 0);
  const avgSalary = salCounted.length ? totalSalary / salCounted.length : 0;
  const totalDr = Number(grandRow?.debitTransactionsAmount ?? 0);
  const avgEOD = Number(cam?.averageBalance ?? 0);
  const totalNetCr = Number(cam?.totalNetCredits ?? grandRow?.creditTransactionsAmount ?? 0);
  const inRet = Number(cam?.inwardReturnCount ?? 0);
  const outRet = Number(cam?.outwardReturnCount ?? 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="font-display text-xl text-gray-800">
            BSA Report{root ? <span className="text-accent-dark"> — {sv(root.accountName)}</span> : null}
          </div>
          <div className="mt-0.5 text-[13px] text-gray-500">
            Bank Statement Analysis · Lead #{leadId}
            {root ? (
              <>
                {" "}
                · {sv(root.bankFullName ?? root.bankName)} · {sv(root.periodStart)} – {sv(root.periodEnd)}
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => router.push("/bsa-report")} className="btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Change Lead
          </button>
          <button type="button" onClick={() => window.print()} className="btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
          <button
            type="button"
            onClick={() => router.push(`/bsa-report?lead_id=${encodeURIComponent(leadId)}`)}
            className="btn-secondary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {apiError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#f5c6c6] bg-[#fdf2f2] px-4 py-3 text-[13px] text-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Error:</strong> {apiError}
          </div>
        </div>
      )}
      {!apiError && !root && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#fcd9a0] bg-[#fff9f0] px-4 py-3 text-[13px] text-[#b7770d]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>No BSA data returned for Lead #{leadId}.</div>
        </div>
      )}

      {root && (
        <div id="bsa-report-print">
          {/* KPI strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              value={inr(avgSalary)}
              label="Avg Monthly Salary"
              sub={`${salCounted.length} months credited`}
              clr="#0f9b8e"
              bg="rgba(15,155,142,.12)"
              icon={<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />}
            />
            <KpiCard
              value={inr(totalNetCr)}
              label="Total Net Credits"
              sub={`${n(grandRow?.noOfNetCreditTransactions ?? grandRow?.noOfCreditTransactions)} txns`}
              clr="#0f9b8e"
              bg="rgba(15,155,142,.12)"
              icon={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
            />
            <KpiCard
              value={inr(totalDr)}
              label="Total Debits"
              sub={`${n(grandRow?.noOfDebitTransactions)} txns`}
              clr="#c0392b"
              bg="rgba(192,57,43,.09)"
              icon={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>}
            />
            <KpiCard
              value={`${totalBounceEvents} Events`}
              label="Bounce Events"
              sub={`Inward: ${inRet} · Outward: ${outRet}`}
              clr={totalBounceEvents > 5 ? "#c0392b" : totalBounceEvents > 0 ? "#b7770d" : "#0f9b8e"}
              bg={totalBounceEvents > 5 ? "rgba(192,57,43,.09)" : totalBounceEvents > 0 ? "rgba(183,119,13,.1)" : "rgba(15,155,142,.1)"}
              icon={<path d="M22 12h-4l-3 9L9 3l-3 9H2" />}
            />
            <KpiCard
              value={inr(avgEOD)}
              label="Avg EOD Balance"
              sub="Overall period avg"
              clr="#3b6ea5"
              bg="rgba(59,110,165,.1)"
              icon={<><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></>}
            />
          </div>

          {/* Account details + Score ring + CAM summary */}
          <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="card">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Account Details
                </span>
                <span className="text-xs text-gray-400">{sv(root.accountNumber)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {[
                  ["Account Holder", root.accountName],
                  ["Bank", root.bankFullName ?? root.bankName],
                  ["Account Number", root.accountNumber],
                  ["IFSC Code", root.ifscCode],
                  ["Branch", root.branchName],
                  ["Account Type", root.accountType],
                  ["PAN", root.panNumber],
                  ["Mobile", root.mobileNumber],
                  ["Statement From", root.periodStart],
                  ["Statement To", root.periodEnd],
                  ["Document Type", root.documentType],
                  ["Product Type", root.productType],
                  ["Months Evaluated", root.monthsEvaluated ? `${root.monthsEvaluated} months` : null],
                  ["Last Txn Date", root.lastCustomerTransactionDate],
                ].map(([l, v], i) => (
                  <div key={l} className={`border-b border-line px-4 py-2.5 ${i % 2 === 0 ? "sm:border-r" : ""}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{l}</div>
                    <div className="text-[13px] font-semibold text-gray-800">{sv(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="card">
                <div className="border-b border-line px-5 py-3">
                  <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    BSA Score
                  </span>
                </div>
                <ScoreRing score={root.score} fraudScore={root.fraudScore} />
              </div>
              <div className="card">
                <div className="border-b border-line px-5 py-3">
                  <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    CAM Summary
                  </span>
                </div>
                <CamSummary cam={cam} />
              </div>
            </div>
          </div>

          {/* Salary strip */}
          {salaryMonths.length > 0 && (
            <div className="card mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                  Salary Credits — {salaryMonths.length} months
                </span>
                <span className="text-xs text-gray-500">
                  Employer: <strong className="text-gray-800">{sv(salaryMonths[0]?.transactions?.[0]?.name)}</strong> · Total:{" "}
                  <strong className="text-gray-800">{inr(totalSalary)}</strong> · Avg: <strong className="text-gray-800">{inr(avgSalary)}</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {salaryMonths.map((sm, i) => (
                  <div key={i} className="rounded-lg border border-line bg-surface p-2.5" style={{ borderLeft: "3px solid #0f9b8e" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{sv(sm.month)}</div>
                    <div className="font-display text-base font-bold text-accent-dark">{inr(sm.totalSalary ?? 0)}</div>
                    <div className="mt-0.5 text-[10px] text-gray-400">{sv(sm.transactions?.[0]?.paymentMode)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          {charts.cLabels.length > 0 && (
            <div className="card mb-5">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  Monthly Credit vs Debit
                </span>
                <span className="text-xs text-gray-400">{monthlyRows.length} months</span>
              </div>
              <div className="p-4">
                <CreditDebitChart labels={charts.cLabels} credits={charts.cCr} debits={charts.cDr} salary={charts.cSal} />
              </div>
            </div>
          )}

          {(charts.cLabels.length > 0 || charts.bLabels.length > 0) && (
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {charts.cLabels.length > 0 && (
                <div className="card">
                  <div className="border-b border-line px-5 py-3">
                    <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      Avg EOD Balance Trend
                    </span>
                  </div>
                  <div className="p-4">
                    <AvgBalanceChart labels={charts.cLabels} avg={charts.cAvg} />
                  </div>
                </div>
              )}
              {charts.bLabels.length > 0 && (
                <div className="card">
                  <div className="border-b border-line px-5 py-3">
                    <span className="flex items-center gap-2 font-display text-[15px] text-gray-800">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0f9b8e" strokeWidth="1.8" width="15" height="15">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      Bounce Events by Month
                    </span>
                  </div>
                  <div className="p-4">
                    <BounceChart labels={charts.bLabels} counts={charts.bCounts} />
                  </div>
                </div>
              )}
            </div>
          )}

          <MonthlyAnalysisTable analysisData={root.analysisData ?? []} />
          <BounceAnalysisTable
            bounceMths={bounceMths}
            totalBounceEvents={totalBounceEvents}
            inRet={inRet}
            outRet={outRet}
            inwardReturnAmount={cam?.inwardReturnAmount ?? 0}
          />
          <FundFlowGrid fundReceived={root.fundReceived ?? []} fundRemittance={root.fundRemittance ?? []} />
          <RecurringPatterns recurIncome={recurIncome} recurExpense={recurExpense} />
          <RiskIndicators totalBounceEvents={totalBounceEvents} cam={cam} grandRow={grandRow} inRet={inRet} outRet={outRet} fraudHits={fraudHits} />
          <FraudIndicators fraudHits={fraudHits} />
          <AllTransactionsTable leadId={leadId} transactions={allTxns} />
        </div>
      )}
    </div>
  );
}
