"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { clientFetch } from "@/lib/clientFetch";
import { Panel, PanelHead, WidgetError, WidgetLoading } from "./shared";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* Raw (un-normalized) business-hours shape — near-zero overnight, ramps
   through the morning, peaks late morning into early afternoon, tapers
   off by evening. Normalized to sum to 1 at render time. */
const RAW_HOUR_WEIGHTS = [
  0.2, 0.1, 0.1, 0.1, 0.2, 0.3, // 12 AM – 6 AM
  1.5, 2.5, 4, // 6 AM – 9 AM
  6, 9, 13, 15, 11, // 9 AM – 2 PM (peak window)
  7, 5, 3.5, 2.5, // 2 PM – 6 PM
  1.5, 1, 0.7, 0.5, // 6 PM – 10 PM
  0.3, 0.2, // 10 PM – 12 AM
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const fmt = (n) => (n === 0 ? "12 AM" : n === 12 ? "12 PM" : n > 12 ? `${n - 12} PM` : `${n} AM`);
  return `${fmt(h)}-${fmt((h + 1) % 24)}`;
});

const FRESH_SHARE = 0.55; // same disclosed ratio components/dashboard/CollectionBreakdown.js uses

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Splits a real total into 24 hourly Fresh/Reloan buckets, exactly summing back to totalCases. */
function buildHourlyEstimate(totalCases) {
  const weightSum = RAW_HOUR_WEIGHTS.reduce((s, w) => s + w, 0);
  const hourCounts = RAW_HOUR_WEIGHTS.map((w) => Math.round((totalCases * w) / weightSum));

  // Force the rounded hourly counts to sum back to the exact real total.
  let drift = totalCases - hourCounts.reduce((s, c) => s + c, 0);
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  hourCounts[peakHour] = Math.max(0, hourCounts[peakHour] + drift);

  return hourCounts.map((count) => {
    const fresh = Math.round(count * FRESH_SHARE);
    return { count, fresh, reloan: count - fresh };
  });
}

/**
 * Hourly Collection Cases — real total case count for the month
 * (/api/collection/report summary.total_customers) distributed across a
 * disclosed, deterministic hourly shape and Fresh/Reloan split, since no
 * hour-of-day timestamp or per-case Fresh/Reloan flag exists anywhere in
 * the backend for collections (same estimation approach already used for
 * the Fresh/Reloan tiles in CollectionBreakdown.js).
 */
export default function HourlyCollectionChart() {
  const [state, setState] = useState({ loading: true, error: null, buckets: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = new URLSearchParams({ startDate: firstOfMonthISO(), endDate: todayISO(), perPage: "1" });
    const res = await clientFetch(`/api/collection/report?${params.toString()}`);
    if (!res.ok || !res.data?.success) {
      setState({ loading: false, error: res.data?.message || res.error || "Could not load collection data.", buckets: null });
      return;
    }
    const total = parseInt(res.data.summary?.total_customers ?? 0, 10) || 0;
    setState({ loading: false, error: null, buckets: buildHourlyEstimate(total) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buckets = state.buckets || [];
  const chartData = {
    labels: HOUR_LABELS,
    datasets: [
      {
        label: "Fresh",
        data: buckets.map((b) => b.fresh),
        backgroundColor: "#1E7E5E",
        stack: "cases",
        maxBarThickness: 22,
      },
      {
        label: "Reloan",
        data: buckets.map((b) => b.reloan),
        backgroundColor: "#e8a33d",
        stack: "cases",
        maxBarThickness: 22,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, font: { size: 11, family: "'DM Sans', sans-serif" } } },
      tooltip: { backgroundColor: "#16223c", padding: 8 },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 9, family: "'DM Sans', sans-serif" }, color: "#9aa3b2", maxRotation: 60, minRotation: 60 },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: "rgba(226,229,234,.5)" },
        ticks: { font: { size: 10 }, color: "#9aa3b2" },
        border: { display: false },
      },
    },
  };

  return (
    <Panel>
      <PanelHead
        title={
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Hourly Collection Cases
          </>
        }
        right={
          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-gray-400">
            Est.
          </span>
        }
      />
      <p className="px-4 pt-2 text-[0.68rem] uppercase tracking-wide text-gray-400 sm:px-5">
        Cases by hour of collection — estimated distribution of this month's real total
      </p>

      {state.loading ? (
        <WidgetLoading label="Loading hourly collection cases…" />
      ) : state.error ? (
        <WidgetError message={state.error} onRetry={load} />
      ) : (
        <div className="px-4 pb-4 pt-3 sm:px-5">
          <div className="h-[220px]">
            <Bar data={chartData} options={options} />
          </div>
        </div>
      )}
    </Panel>
  );
}
