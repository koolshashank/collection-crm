"use client";

import Link from "next/link";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import Modal from "@/components/ui/Modal";
import { CiIcon } from "@/components/client-info/icons";
import Sparkline from "./Sparkline";
import { coInr } from "@/components/collection/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function fmtDay(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-gray-800">{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-gray-400">{sub}</div>}
    </div>
  );
}

/**
 * Detail view for the Total Collection tile — daily average / highest /
 * lowest day, a this-period-vs-previous-period trend line, and the
 * Fresh/Reloan split. Everything here comes straight from the same fetch
 * CollectionBreakdown already made (real per-day totals from the leads the
 * report API returned) — Fresh/Reloan stay labeled "Est." since that split
 * itself is still a proportional estimate, same as the tiles on the dashboard.
 */
export default function TotalCollectionModal({
  open,
  onClose,
  total,
  totalCustomers,
  trend,
  dailyAverage,
  highestDay,
  lowestDay,
  currentSeries,
  previousSeries,
  fresh,
  reloan,
}) {
  const chartData = {
    labels: currentSeries.map((d) => d.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })),
    datasets: [
      {
        label: "This Period",
        data: currentSeries.map((d) => d.value),
        borderColor: "#3b6ea5",
        backgroundColor: "#3b6ea51a",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Previous Period",
        data: previousSeries.map((d) => d.value),
        borderColor: "#9aa3b2",
        borderDash: [4, 4],
        fill: false,
        tension: 0.35,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", align: "end", labels: { boxWidth: 10, usePointStyle: true, font: { size: 10.5 } } },
      tooltip: { backgroundColor: "#16223c", padding: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: "rgba(226,229,234,.5)" } },
    },
  };

  const sources = [
    { label: "Fresh", color: "#9b59b6", ...fresh },
    { label: "Reloan", color: "#c2185b", ...reloan },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf2fb] text-[#3b6ea5]">
            <CiIcon name="refresh" size={14} strokeWidth={2} />
          </span>
          Total Collection
        </span>
      }
      footer={
        <Link href="/collection" className="text-sm font-semibold text-accent-dark hover:underline">
          View Full Report →
        </Link>
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-2xl font-bold text-gray-800">{coInr(total)}</div>
          <div className="mt-0.5 text-xs text-gray-400">{totalCustomers.toLocaleString("en-IN")} cases</div>
          {trend !== 0 && (
            <div className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${trend > 0 ? "text-emerald-700" : "text-danger"}`}>
              {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last period
            </div>
          )}
        </div>
        <div className="h-10 w-24 shrink-0">
          <Sparkline values={currentSeries.map((d) => d.value)} color="#3b6ea5" />
        </div>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Overview</h4>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Daily Average" value={coInr(dailyAverage)} />
          <StatTile label="Highest Day" value={highestDay ? coInr(highestDay.value) : "—"} sub={highestDay ? fmtDay(highestDay.date) : null} />
          <StatTile label="Lowest Day" value={lowestDay ? coInr(lowestDay.value) : "—"} sub={lowestDay ? fmtDay(lowestDay.date) : null} />
        </div>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Collection Trend</h4>
        <div className="h-[180px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Top Sources</h4>
        <div className="space-y-2.5">
          {sources.map((s) => {
            const pct = total > 0 ? Math.round((s.amount / total) * 1000) / 10 : 0;
            return (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">
                    {s.label} <span className="font-normal text-gray-400">(Est.)</span>
                  </span>
                  <span className="text-gray-500">
                    {coInr(s.amount)} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
