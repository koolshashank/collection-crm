"use client";

import { StatCard } from "@/components/ui/Feedback";

export default function CallReportsSummary({ summary }) {
  const totalMin = Math.round((summary.totalDurationSec ?? 0) / 60);
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Total Calls" value={(summary.total ?? 0).toLocaleString("en-IN")} icon="📞" />
      <StatCard label="Connected" value={(summary.connected ?? 0).toLocaleString("en-IN")} icon="✅" tone="accent" />
      <StatCard label="Missed / Failed" value={(summary.missed ?? 0).toLocaleString("en-IN")} icon="⚠️" tone="danger" />
      <StatCard label="Total Talk Time" value={`${totalMin.toLocaleString("en-IN")} min`} icon="⏱️" />
    </div>
  );
}
