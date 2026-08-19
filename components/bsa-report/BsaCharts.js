"use client";

import { Bar, Line, Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { inrShort } from "@/lib/bsaHelpers";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, PointElement, Tooltip, Legend, Filler);

const TOOLTIP = {
  backgroundColor: "rgba(27,42,74,.92)",
  titleColor: "#fff",
  bodyColor: "rgba(255,255,255,.85)",
  padding: 10,
  cornerRadius: 8,
};

const baseScales = {
  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
  y: { grid: { color: "rgba(226,229,234,.5)" }, ticks: { font: { size: 10 }, callback: inrShort } },
};

/** Grouped bar (Credits/Debits) + overlaid Salary line — matches bsa.php's chartCrDr. */
export function CreditDebitChart({ labels, credits, debits, salary }) {
  const data = {
    labels,
    datasets: [
      { type: "bar", label: "Credits", data: credits, backgroundColor: "rgba(15,155,142,.75)", borderColor: "#0f9b8e", borderWidth: 1.5, borderRadius: 4 },
      { type: "bar", label: "Debits", data: debits, backgroundColor: "rgba(214,69,69,.65)", borderColor: "#d64545", borderWidth: 1.5, borderRadius: 4 },
      { type: "line", label: "Salary", data: salary, borderColor: "#e8a33d", backgroundColor: "rgba(232,163,61,.08)", fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#e8a33d" },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { ...TOOLTIP, callbacks: { label: (c) => ` ${c.dataset.label}: ${inrShort(c.parsed.y)}` } },
    },
    scales: baseScales,
  };
  return (
    <div className="h-[220px]">
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}

/** Avg EOD balance trend — filled line. */
export function AvgBalanceChart({ labels, avg }) {
  const data = {
    labels,
    datasets: [
      { label: "Avg EOD", data: avg, borderColor: "#0f9b8e", backgroundColor: "rgba(15,155,142,.08)", fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#0f9b8e" },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...TOOLTIP, callbacks: { label: (c) => ` Avg EOD: ${inrShort(c.parsed.y)}` } },
    },
    scales: baseScales,
  };
  return (
    <div className="h-[220px]">
      <Line data={data} options={options} />
    </div>
  );
}

/** Bounce events per month — plain bar, integer steps. */
export function BounceChart({ labels, counts }) {
  const data = {
    labels,
    datasets: [{ label: "Bounce Events", data: counts, backgroundColor: "rgba(214,69,69,.65)", borderColor: "#d64545", borderWidth: 1.5, borderRadius: 4 }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: TOOLTIP },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: "rgba(226,229,234,.5)" }, ticks: { font: { size: 10 }, stepSize: 1, precision: 0 } },
    },
  };
  return (
    <div className="h-[220px]">
      <Bar data={data} options={options} />
    </div>
  );
}
