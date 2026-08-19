"use client";

import { Suspense, useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";
import { SectionLabel, useApi } from "@/components/dashboard/shared";
import {
  buildMonthlyData,
  dpdBucketCount,
  firstOfMonthISO,
  fmtInr,
  isNumeric,
  kpiVal,
  numberFormat,
  todayISO,
} from "@/components/dashboard/format";
import MonthlyTarget from "@/components/dashboard/MonthlyTarget";
import CoreKpis from "@/components/dashboard/CoreKpis";
import CollectionBreakdown from "@/components/dashboard/CollectionBreakdown";
import DateRangeFilterPanel from "@/components/dashboard/DateRangeFilterPanel";
import DpdBuckets from "@/components/dashboard/DpdBuckets";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import RecoveryBreakdown from "@/components/dashboard/RecoveryBreakdown";
import TopPerformers from "@/components/dashboard/TopPerformers";
// import WhatsAppAnalytics from "@/components/dashboard/WhatsAppAnalytics"; // temporarily replaced, not removed
import HourlyCollectionChart from "@/components/dashboard/HourlyCollectionChart";

const DPD_BUCKET_LABELS = ["No DPD", "1-30 DPD", "31-60 DPD", "61-90 DPD", "91-120 DPD", "121-180 DPD", "180+ DPD"];

function fmtRangeDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* Same role gate as dashboard.php:
   menuOn('settlement') && (ADMIN || COLLECTION-HEAD || ACM || COLLECTION-EXECUTIVE) */
const GATE_ROLES = ["ADMIN", "COLLECTION-HEAD", "ACM", "COLLECTION-EXECUTIVE"];

function DashboardInner() {
  const toast = useToast();
  const me = useApi("/api/auth/me");

  /* Shared date range — Collection Amount tiles and the "Filter by Date
     Range" panel both read/write this one source of truth. */
  const [range, setRange] = useState({ startDate: firstOfMonthISO(), endDate: todayISO() });

  /* Data sources — one proxy route per dashboard.php db_fetch() call */
  const cardsRes = useApi("/api/dashboard/cards");
  const monthlyRes = useApi("/api/dashboard/monthly-collection");
  const portfolioRes = useApi("/api/dashboard/portfolio-count");
  const adminRes = useApi("/api/dashboard/admin?time=today");
  const summaryRes = useApi("/api/dashboard/portfolio-summary");

  /* menuOn('settlement'): PHP always renders, JS hides per the
     localStorage "crm_menu_config" menu-manager config */
  const [menuOn, setMenuOn] = useState(true);
  useEffect(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("crm_menu_config") || "{}");
      setMenuOn(!cfg?.settlement || cfg.settlement.visible !== false);
    } catch {
      setMenuOn(true);
    }
  }, []);

  if (me.loading) return <PageLoader label="Loading dashboard…" />;
  if (me.error || !me.data?.user) {
    return (
      <ErrorState
        message={me.error || "Could not load your session."}
        onRetry={me.reload}
      />
    );
  }

  const user = me.data.user;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  const gateOk = menuOn && GATE_ROLES.some((r) => userRoles.includes(r));

  /* ── Derived data (mirror of the PHP block) ─────────────────── */
  const monthlyData = buildMonthlyData(monthlyRes.data?.result);
  const cd = cardsRes.data ?? {};
  const apiCards = cd.cards ?? cd.data ?? cd.result ?? {};
  const portfolioTotal =
    parseInt(portfolioRes.data?.pagination?.totalItems ?? 0, 10) || 0;
  const ad = adminRes.data ?? {};
  const adminDashCollection =
    ad.collectionAmount ?? ad?.data?.collectionAmount ?? null;
  const portfolioSummary = summaryRes.data?.summary ?? {};
  const summaryLive = Object.keys(portfolioSummary).length > 0;

  let peakVal = 0;
  let peakLabel = "—";
  for (const row of monthlyData) {
    if (row.val > peakVal) {
      peakVal = row.val;
      peakLabel = row.full;
    }
  }
  const currVal = monthlyData[monthlyData.length - 1]?.val ?? 0;
  const totalCollected = Number(adminDashCollection?.total ?? currVal ?? 0);
  const freshPct = Number(adminDashCollection?.percentages?.fresh ?? 0);
  const reloanPct = Number(adminDashCollection?.percentages?.reloan ?? 0);
  const freshCollected = (totalCollected * freshPct) / 100;
  const reloanCollected = (totalCollected * reloanPct) / 100;
  const prevVal = monthlyData[monthlyData.length - 2]?.val ?? 0;
  const mom =
    prevVal > 0 ? Math.round(((currVal - prevVal) / prevVal) * 1000) / 10 : 0;
  const chartTotal = monthlyData.reduce((s, r) => s + r.val, 0);

  /* Core KPIs — portfolio-summary first, dashboard-cards fallback */
  const kTotal =
    portfolioSummary.totalLeads ??
    kpiVal(apiCards, "total_accounts", "totalAccounts", "total_leads") ??
    (portfolioTotal || "—");
  const kRate =
    kpiVal(apiCards, "collection_percentage", "recovery_rate") ?? "—";

  const totalDisp = isNumeric(kTotal)
    ? numberFormat(kTotal)
    : kTotal || (portfolioTotal ? numberFormat(portfolioTotal) : "—");
  const collDisp =
    adminDashCollection && Number(adminDashCollection.total ?? 0) > 0
      ? fmtInr(adminDashCollection.total)
      : currVal > 0
        ? fmtInr(currVal)
        : "—"; // fallback to old source if new API returns nothing
  const collSub =
    adminDashCollection && adminDashCollection.percentages
      ? {
          fresh:
            Math.round(Number(adminDashCollection.percentages.fresh) * 10) / 10,
          reloan:
            Math.round(Number(adminDashCollection.percentages.reloan) * 10) /
            10,
        }
      : null;
  const rateDisp = isNumeric(kRate)
    ? `${Math.round(Number(kRate) * 10) / 10}%`
    : kRate || "—";
  const rateBar = isNumeric(kRate) ? Math.min(100, Number(kRate)) : null;
  const peakDisp = peakVal > 0 ? fmtInr(peakVal) : "—";

  /* DPD buckets — dpdBucketDistribution first, dashboard-cards fallback */
  const dpdValues = [
    dpdBucketCount(portfolioSummary, "no_dpd") ??
      kpiVal(apiCards, "no_dpd", "dpd_0", "bucket_0", "dpd_0_accounts") ??
      "—",
    dpdBucketCount(portfolioSummary, "1_30") ??
      kpiVal(apiCards, "dpd_0_30", "bucket_0_30", "dpd_1_30", "dpd0to30") ??
      "—",
    dpdBucketCount(portfolioSummary, "31_60") ??
      kpiVal(apiCards, "dpd_31_60", "bucket_31_60", "dpd31to60") ??
      "—",
    dpdBucketCount(portfolioSummary, "61_90") ??
      kpiVal(apiCards, "dpd_61_90", "bucket_61_90", "dpd61to90") ??
      "—",
    dpdBucketCount(portfolioSummary, "91_120") ??
      kpiVal(apiCards, "dpd_91_120", "bucket_91_120", "dpd91to120") ??
      "—",
    dpdBucketCount(portfolioSummary, "121_180") ??
      kpiVal(apiCards, "dpd_121_180", "bucket_121_180", "dpd121to180") ??
      "—",
    dpdBucketCount(portfolioSummary, "180_plus") ??
      kpiVal(apiCards, "dpd_180_plus", "bucket_180_plus", "dpd180plus") ??
      "—",
  ];

  /* Per-widget loading / error orchestration */
  const coreSources = [
    cardsRes,
    monthlyRes,
    portfolioRes,
    adminRes,
    summaryRes,
  ];
  const coreLoading = coreSources.some((s) => s.loading);
  const coreError = coreSources.every((s) => s.error)
    ? "Could not load dashboard data."
    : null;
  const retryFailedCore = () =>
    coreSources.forEach((s) => s.error && s.reload());

  const dpdLoading = summaryRes.loading || cardsRes.loading;
  const dpdError =
    summaryRes.error && cardsRes.error
      ? "Could not load DPD bucket data."
      : null;
  const retryDpd = () => {
    if (summaryRes.error) summaryRes.reload();
    if (cardsRes.error) cardsRes.reload();
  };

  /* Client-side snapshot export — every number here is already loaded on
     this page, so no extra backend route is needed for it. */
  function exportSnapshot() {
    const rows = [
      ["Metric", "Value"],
      ["Date range", `${range.startDate} to ${range.endDate}`],
      ["Total accounts", totalDisp],
      ["Collection (selected admin range)", collDisp],
      ["Recovery rate", rateDisp],
      ["Peak month", `${peakLabel} (${peakDisp})`],
      ["Month-over-month growth", `${mom}%`],
      ...DPD_BUCKET_LABELS.map((label, i) => [label, isNumeric(dpdValues[i]) ? numberFormat(dpdValues[i]) : dpdValues[i]]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_snapshot_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-dark">
            <CiIcon name="rupee" size={18} strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-gray-800 sm:text-xl">Collections Dashboard</h1>
            <p className="text-xs text-gray-500">Real-time overview of collections performance and recovery</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-gray-600">
            <CiIcon name="cal" size={13} strokeWidth={2} className="text-gray-400" />
            {fmtRangeDate(range.startDate)} – {fmtRangeDate(range.endDate)}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => toast.error("Comparison view isn't available yet.")}
          >
            Compare to
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()} aria-label="Refresh">
            <CiIcon name="refresh" size={14} strokeWidth={2} />
          </button>
          <button type="button" className="btn-primary" onClick={exportSnapshot}>
            <CiIcon name="download" size={14} strokeWidth={2} />
            Export
          </button>
        </div>
      </div>

      <MonthlyTarget
        totalCollected={totalCollected}
        freshCollected={freshCollected}
        reloanCollected={reloanCollected}
        canEdit={userRoles.includes("ADMIN") || userRoles.includes("COLLECTION-HEAD")}
      />

      {gateOk && (
        <>
          {/* ── Core KPIs — temporarily hidden, not removed ──
          <SectionLabel>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3 w-3"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Portfolio Overview
          </SectionLabel>
          <CoreKpis
            loading={coreLoading}
            error={coreError}
            onRetry={retryFailedCore}
            totalDisp={totalDisp}
            collDisp={collDisp}
            collSub={collSub}
            rateDisp={rateDisp}
            rateBar={rateBar}
            mom={mom}
            peakDisp={peakDisp}
            peakLabel={peakLabel}
          />
          ── end Core KPIs ── */}

          {/* ── Collection amount as of date range ── */}
          <CollectionBreakdown range={range} onRangeChange={setRange} />

          {/* ── DPD buckets ── */}
          <DpdBuckets
            values={dpdValues}
            live={summaryLive}
            loading={dpdLoading}
            error={dpdError}
            onRetry={retryDpd}
          />

          {/* ── Chart + Recovery breakdown ── */}
          <SectionLabel>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3 w-3"
            >
              <rect x="18" y="3" width="4" height="18" />
              <rect x="10" y="8" width="4" height="13" />
              <rect x="2" y="13" width="4" height="8" />
            </svg>
            Collections &amp; Recovery
          </SectionLabel>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px_260px]">
            <MonthlyChart
              data={monthlyData.length ? monthlyData : buildMonthlyData({})}
              loading={monthlyRes.loading}
              error={monthlyRes.error}
              onRetry={monthlyRes.reload}
              currVal={currVal}
              prevVal={prevVal}
              mom={mom}
              peakVal={peakVal}
              peakLabel={peakLabel}
              chartTotal={chartTotal}
            />
            <RecoveryBreakdown totalAmount={totalCollected} />
            <DateRangeFilterPanel range={range} onApply={setRange} />
          </div>

          {/* ── Top / Bottom performers ── */}
          <TopPerformers />

          {/* ── WhatsApp analytics — temporarily replaced, not removed ──
          <WhatsAppAnalytics />
          */}
          <HourlyCollectionChart />
        </>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading dashboard…" />}>
      <DashboardInner />
    </Suspense>
  );
}
