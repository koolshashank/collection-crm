"use client";

import Link from "next/link";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { fmtInr } from "./format";
import { Panel, PanelHead, StatsStrip, WidgetError, WidgetLoading } from "./shared";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/* Same compact formatter as the inline fi() in dashboard.php's chart JS */
function fi(n) {
  if (!n) return "No data";
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(1) + "Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1) + "L";
  if (n >= 1e3) return "₹" + (n / 1e3).toFixed(1) + "K";
  return "₹" + n;
}

/* Draws the value label above each bar (mirror of the .db-bv labels) */
const valueLabelPlugin = {
  id: "dbValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const vals = chart.data.datasets[0]?.data || [];
    ctx.save();
    ctx.font = "600 9px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    meta.data.forEach((bar, i) => {
      const v = Number(vals[i] || 0);
      if (v > 0) {
        ctx.fillStyle = i === vals.length - 1 ? "#0c7a70" : "#9aa3b2";
        ctx.fillText(fi(v), bar.x, bar.y - 3);
      }
    });
    ctx.restore();
  },
};

/**
 * Monthly Collections — Last 8 Months. Bar chart (same data/labels as the
 * PHP bar chart: short month labels, "Month YYYY: ₹X" tooltips, rightmost
 * bar = current month highlighted) + the stats strip below it.
 */
export default function MonthlyChart({ data, loading, error, onRetry, currVal, prevVal, mom, peakVal, peakLabel, chartTotal }) {
  const chartData = {
    labels: data.map((d) => d.short),
    datasets: [
      {
        data: data.map((d) => d.val),
        backgroundColor: data.map((_, i) => (i === data.length - 1 ? "#0f9b8e" : "#cdebe7")),
        hoverBackgroundColor: "#0c7a70",
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: "bottom",
        maxBarThickness: 56,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: "#16223c",
        padding: 8,
        callbacks: {
          title: () => "",
          label: (ctx) => `${data[ctx.dataIndex]?.full}: ${fi(Number(ctx.raw) || 0)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10, family: "'DM Sans', sans-serif" }, color: "#9aa3b2" } },
      y: { beginAtZero: true, grid: { color: "rgba(226,229,234,.5)" }, ticks: { display: false }, border: { display: false } },
    },
  };

  return (
    <Panel>
      <PanelHead
        title={
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent">
              <rect x="18" y="3" width="4" height="18" />
              <rect x="10" y="8" width="4" height="13" />
              <rect x="2" y="13" width="4" height="8" />
            </svg>
            Monthly Collections — Last 8 Months
          </>
        }
        link={
          <Link href="/performance-report" className="text-[0.72rem] font-semibold text-accent hover:underline">
            Full Report →
          </Link>
        }
      />

      {loading ? (
        <WidgetLoading label="Loading monthly collections…" />
      ) : error ? (
        <WidgetError message={error} onRetry={onRetry} />
      ) : (
        <>
          <div className="px-4 pb-2 pt-4 sm:px-5">
            <div className="h-[190px]">
              <Bar data={chartData} options={options} plugins={[valueLabelPlugin]} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 pt-1 text-[0.71rem] text-gray-400 sm:px-5">
            <span>8-month view &nbsp;·&nbsp; Rightmost bar = current month</span>
            {peakVal > 0 && (
              <span>
                Peak: <strong className="text-gray-800">&nbsp;{fmtInr(peakVal)}</strong>
                <span className="ml-1 rounded-full bg-accent-light px-1.5 py-0.5 text-[0.64rem] font-bold text-accent-dark">{peakLabel}</span>
              </span>
            )}
            {chartTotal > 0 && (
              <span>
                8-mo total: <strong className="text-gray-800">&nbsp;{fmtInr(chartTotal)}</strong>
              </span>
            )}
          </div>
          <StatsStrip
            items={[
              { value: currVal > 0 ? fmtInr(currVal) : "—", label: "This Month" },
              { value: prevVal > 0 ? fmtInr(prevVal) : "—", label: "Last Month" },
              { value: `${mom >= 0 ? "+" : ""}${mom}%`, label: "MoM Growth", color: mom >= 0 ? "#1E7E5E" : "#d64545" },
              { value: chartTotal > 0 ? fmtInr(chartTotal) : "—", label: "8-Month Total" },
            ]}
          />
        </>
      )}
    </Panel>
  );
}
