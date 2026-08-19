"use client";

import Link from "next/link";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import Modal from "@/components/ui/Modal";
import { fmtInr } from "./format";
import { REC_ITEMS } from "./RecoveryBreakdown";

ChartJS.register(ArcElement, Tooltip);

/**
 * Detail view for the Recovery Breakdown donut. The 58/18/19/5% split is
 * the same illustrative distribution the panel itself already showed
 * (dashboard.php's static $recItems, ported as-is) — flagged here rather
 * than dressed up as measured data, since there's no live recovery-status
 * API behind it yet. Amounts scale off the real collection total for the
 * selected range.
 */
export default function RecoveryBreakdownModal({ open, onClose, totalAmount }) {
  const hasTotal = Number(totalAmount) > 0;
  const amt = (pct) => (hasTotal ? (Number(totalAmount) * pct) / 100 : 0);

  const doughnutData = {
    labels: REC_ITEMS.map((r) => r.name),
    datasets: [
      {
        data: REC_ITEMS.map((r) => r.pct),
        backgroundColor: REC_ITEMS.map((r) => r.color),
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#16223c", padding: 8, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } },
    },
  };

  const recovered = REC_ITEMS.find((r) => r.name === "Recovered");
  const notRecovered = REC_ITEMS.find((r) => r.name === "Not Recovered");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1E7E5E]" />
          Recovery Breakdown
        </span>
      }
      footer={
        <Link href="/vintage-analysis" className="text-sm font-semibold text-accent-dark hover:underline">
          View Detailed Report →
        </Link>
      }
    >
      <div className="flex items-center gap-5">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-400">Total</span>
            <span className="text-sm font-bold text-gray-800">{hasTotal ? fmtInr(totalAmount) : "—"}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {REC_ITEMS.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="shrink-0 font-semibold text-gray-800">
                {r.pct}% · {hasTotal ? fmtInr(amt(r.pct)) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-center">
          <div className="text-lg font-bold text-emerald-700">{recovered.pct}%</div>
          <div className="text-xs font-semibold text-emerald-700">{hasTotal ? fmtInr(amt(recovered.pct)) : "—"}</div>
          <div className="mt-0.5 text-[10.5px] text-emerald-600">Recovery Rate</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-center">
          <div className="text-lg font-bold text-amber-700">{notRecovered.pct}%</div>
          <div className="text-xs font-semibold text-amber-700">{hasTotal ? fmtInr(amt(notRecovered.pct)) : "—"}</div>
          <div className="mt-0.5 text-[10.5px] text-amber-600">Not Recovered</div>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-[11px] leading-relaxed text-gray-500">
        This split is an illustrative distribution, not yet backed by a live recovery-status feed — treat the
        percentages as directional until that data source is wired up.
      </p>
    </Modal>
  );
}
