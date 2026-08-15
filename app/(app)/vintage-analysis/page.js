"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import VintageChart from "@/components/reports/VintageChart";
import VintageSummaryTable from "@/components/reports/VintageSummaryTable";

/**
 * Vintage Analysis — cross-tabs the portfolio by origination month cohort
 * against current DPD bucket. ADMIN only. Backed by
 * /api/reports/vintage-analysis, which pulls the ENTIRE portfolio
 * (no vintage endpoint exists upstream) — first load can take a while,
 * subsequent loads within 20 min are served from that route's cache.
 */
export default function VintageAnalysisPage() {
  const router = useRouter();

  const [gateLoading, setGateLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const res = await clientFetch(`/api/reports/vintage-analysis${refresh ? "?refresh=true" : ""}`, {}, 120000);
    setLoading(false);
    setRefreshing(false);

    if (!res.ok || !res.data?.success) {
      setError(res.data?.message || res.error || "Could not load vintage analysis.");
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await clientFetch("/api/auth/me");
      const roles = me.ok ? me.data?.user?.roles ?? [] : [];
      if (!roles.includes("ADMIN")) {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
      setGateLoading(false);
      load();
    })();
  }, [router, load]);

  if (gateLoading || !allowed) return <PageLoader label="Loading…" />;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Vintage Analysis</h1>
          <p className="mt-1 text-sm text-gray-500">Portfolio DPD performance by loan origination month</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      {loading ? (
        <div className="card p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-accent-light border-t-accent" />
            <div className="text-sm font-semibold text-gray-600">Analyzing full portfolio — this can take up to a minute…</div>
            <div className="text-xs text-gray-400">No vintage report exists upstream, so every loan is being pulled and cross-tabbed live.</div>
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(false)} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs text-gray-500">
            <span>
              As of {new Date(data.computedAt).toLocaleString("en-IN")} · {data.totalLoans.toLocaleString("en-IN")} loans across{" "}
              {data.pagesScanned} page{data.pagesScanned === 1 ? "" : "s"}
            </span>
            <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {data.truncated && (
            <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber-900">
              ⚠ This report was cut short{data.message ? `: ${data.message}` : ""} — numbers below may not reflect the full portfolio.
            </div>
          )}

          <div className="card mb-5 p-5">
            <h3 className="mb-3 font-display text-base text-gray-800">DPD Composition by Origination Cohort</h3>
            <VintageChart cohorts={data.cohorts} />
          </div>

          <div className="card overflow-hidden">
            <h3 className="border-b border-line px-5 py-3.5 font-display text-base text-gray-800">Cohort Detail</h3>
            <VintageSummaryTable cohorts={data.cohorts} />
          </div>
        </>
      )}
    </div>
  );
}
