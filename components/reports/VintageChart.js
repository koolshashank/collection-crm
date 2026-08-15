"use client";

import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { DPD_BUCKETS, UNKNOWN_BUCKET, bucketColor, bucketLabel } from "@/lib/dpdBuckets";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COLUMNS = [...DPD_BUCKETS, UNKNOWN_BUCKET];

/** Stacked bar — one series per DPD bucket, x-axis = cohort month (oldest→newest). */
export default function VintageChart({ cohorts }) {
  const [mode, setMode] = useState("count"); // "count" | "pct"

  const dated = useMemo(
    () => cohorts.filter((c) => c.month !== "older" && c.month !== "unknown-cohort").slice().reverse(),
    [cohorts]
  );

  const chartData = {
    labels: dated.map((c) => c.label),
    datasets: COLUMNS.filter((b) => dated.some((c) => c.buckets[b.key].count > 0)).map((b) => ({
      label: bucketLabel(b.key),
      backgroundColor: bucketColor(b.key),
      stack: "vintage",
      maxBarThickness: 42,
      data: dated.map((c) => {
        const cell = c.buckets[b.key];
        if (mode === "pct") return c.totalCount ? Math.round((cell.count / c.totalCount) * 1000) / 10 : 0;
        return cell.count;
      }),
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11, family: "'DM Sans', sans-serif" } } },
      tooltip: {
        backgroundColor: "#16223c",
        padding: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${mode === "pct" ? "%" : ""}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        stacked: true,
        beginAtZero: true,
        max: mode === "pct" ? 100 : undefined,
        grid: { color: "rgba(226,229,234,.5)" },
        ticks: { font: { size: 10 } },
      },
    },
  };

  if (!dated.length) {
    return <div className="p-6 text-center text-sm text-gray-500">No dated cohorts to chart.</div>;
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1.5">
        {[
          { key: "count", label: "Loan Count" },
          { key: "pct", label: "% of Cohort" },
        ].map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              mode === m.key ? "border-accent bg-accent-light text-accent-dark" : "border-line bg-white text-gray-500 hover:bg-surface"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-[320px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
