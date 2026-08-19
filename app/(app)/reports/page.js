"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";
import { firstOfMonthISO, todayISO } from "@/components/dashboard/format";
import StatCards from "@/components/reports/StatCards";
import ReportsFilterPanel from "@/components/reports/ReportsFilterPanel";
import CollectionSummaryReport from "@/components/reports/CollectionSummaryReport";
import RecoverySummaryReport from "@/components/reports/RecoverySummaryReport";
import DpdAnalysisReport from "@/components/reports/DpdAnalysisReport";
import CreditPersonParReport from "@/components/reports/CreditPersonParReport";
import {
  REPORT_TYPES,
  getReportStats,
  getCollectionSummary,
  getRecoverySummary,
  getDpdAnalysis,
  getCreditPersonPar,
} from "@/lib/reportsMock";

/* Same admin gate this codebase uses for other admin-only surfaces
   (settings, audit, role-permissions). menuConfig.js gates /reports the
   same way. */
const ADMIN_ROLES = ["ADMIN", "COLLECTION-HEAD", "RECOVERY_HEAD"];

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_FILTERS = {
  startDate: firstOfMonthISO(),
  endDate: todayISO(),
  compareStart: isoDaysAgo(48),
  compareEnd: isoDaysAgo(18),
  reportType: REPORT_TYPES[0].key,
  team: "All Teams",
  source: "All Sources",
};

function fmtRangeDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Flattens the currently-loaded report into CSV rows — real export, just
 * off the same dummy data the page renders until the reports API exists. */
function reportToCsvRows(reportType, data) {
  if (reportType === "collection_summary") {
    return [
      ["Team", "Total Cases", "Total Outstanding", "Collected", "Recovered", "Overdue Cases", "Collection %", "Recovery %"],
      ...data.rows.map((r) => [r.team, r.totalCases, r.totalOutstanding, r.collected, r.recovered, r.overdueCases, r.collectionPct, r.recoveryPct]),
      ["Total", data.total.totalCases, data.total.totalOutstanding, data.total.collected, data.total.recovered, data.total.overdueCases, data.total.collectionPct, data.total.recoveryPct],
    ];
  }
  if (reportType === "recovery_summary") {
    return [
      ["Recovery Status", "Cases", "Amount", "% of Total", "Avg Recovery per Case"],
      ...data.breakdown.map((b) => [b.status, b.cases, b.amount, b.pct, b.avgPerCase]),
      ["Total", data.totalCases, data.totalAmount, 100, Math.round(data.totalAmount / data.totalCases)],
    ];
  }
  if (reportType === "credit_person_par") {
    return [
      ["Credit Person", "Cases Sanctioned", "Cases in PAR", "PAR %", "Sanction Amount", "Outstanding in PAR"],
      ...data.rows.map((r) => [r.name, r.totalCases, r.parCases, r.parPct, r.sanctionAmt, r.parOutstanding]),
      ["Total", data.total.totalCases, data.total.parCases, data.total.parPct, data.total.sanctionAmt, data.total.parOutstanding],
    ];
  }
  return [
    ["DPD Bucket", "Cases", "Outstanding Amount", "% of Total Cases", "Avg Outstanding"],
    ...data.buckets.map((b) => [b.label, b.cases, b.outstanding, b.pct, b.avgTicket]),
    ["Total", data.total.cases, data.total.outstanding, 100, Math.round(data.total.outstanding / data.total.cases)],
  ];
}

export default function ReportsPage() {
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await clientFetch("/api/auth/me");
      const roles = me.ok ? me.data?.user?.roles ?? [] : [];
      const isAdmin = ADMIN_ROLES.some((r) => roles.includes(r));
      if (!isAdmin) {
        router.replace("/dashboard");
        return;
      }
      if (!cancelled) {
        setAllowed(true);
        setCheckingAccess(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadStats = useCallback(async () => {
    const res = await getReportStats();
    if (res.success) setStats(res.stats);
  }, []);

  const loadReport = useCallback(async () => {
    const type = filters.reportType;
    setLoadingReport(true);
    let res;
    if (type === "collection_summary") res = await getCollectionSummary();
    else if (type === "recovery_summary") res = await getRecoverySummary();
    else if (type === "credit_person_par") res = await getCreditPersonPar();
    else res = await getDpdAnalysis();
    // Tag the result with the report type it was fetched for — filters.reportType
    // may have already changed again by the time this resolves (switching
    // report types re-renders once before this effect re-fires), so the
    // render below must never trust reportData's shape without checking it
    // actually matches the currently-selected type.
    setReportData({ type, ...res });
    setLoadingReport(false);
  }, [filters.reportType, filters.startDate, filters.endDate, filters.team, filters.source]);

  useEffect(() => {
    if (!allowed) return;
    loadStats();
  }, [allowed, loadStats]);

  useEffect(() => {
    if (!allowed) return;
    loadReport();
  }, [allowed, loadReport]);

  function exportCsv() {
    if (!reportData || reportData.type !== filters.reportType) return;
    const rows = reportToCsvRows(filters.reportType, reportData);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filters.reportType}_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checkingAccess || !allowed) return <PageLoader label="Loading reports…" />;

  const activeReportLabel = REPORT_TYPES.find((r) => r.key === filters.reportType)?.label || "Report";

  return (
    <div className="mx-auto max-w-7xl pb-16">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-800 sm:text-2xl">Reports</h1>
          <p className="text-xs text-gray-500">Track performance, collections, recovery and team activities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-gray-600">
            <CiIcon name="cal" size={13} strokeWidth={2} className="text-gray-400" />
            {fmtRangeDate(filters.startDate)} – {fmtRangeDate(filters.endDate)}
          </span>
          <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-gray-500 sm:inline-flex">
            vs {fmtRangeDate(filters.compareStart)} – {fmtRangeDate(filters.compareEnd)}
          </span>
          <Link href="/dashboard" className="btn-secondary">
            <CiIcon name="back" size={13} strokeWidth={2} />
            Back
          </Link>
          <button type="button" className="btn-primary" onClick={exportCsv} disabled={!reportData || reportData.type !== filters.reportType}>
            <CiIcon name="download" size={14} strokeWidth={2} />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {stats && <StatCards stats={stats} compareLabel={`${fmtRangeDate(filters.compareStart)} - ${fmtRangeDate(filters.compareEnd)}`} />}

      {/* Report content + filters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <h2 className="mb-3 font-display text-base font-bold text-gray-800">{activeReportLabel}</h2>
          {loadingReport || !reportData || reportData.type !== filters.reportType ? (
            <PageLoader label={`Loading ${activeReportLabel.toLowerCase()}…`} />
          ) : filters.reportType === "collection_summary" ? (
            <CollectionSummaryReport data={reportData} />
          ) : filters.reportType === "recovery_summary" ? (
            <RecoverySummaryReport data={reportData} />
          ) : filters.reportType === "credit_person_par" ? (
            <CreditPersonParReport data={reportData} />
          ) : (
            <DpdAnalysisReport data={reportData} />
          )}
        </div>

        <div>
          <ReportsFilterPanel filters={filters} defaults={DEFAULT_FILTERS} onApply={setFilters} />
        </div>
      </div>
    </div>
  );
}
