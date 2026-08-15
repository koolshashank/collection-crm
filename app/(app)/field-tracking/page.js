"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { ErrorState, StatCard } from "@/components/ui/Feedback";
import AgentListPanel from "@/components/field-tracking/AgentListPanel";
import RoutePanel from "@/components/field-tracking/RoutePanel";
import DetailTabs from "@/components/field-tracking/DetailTabs";

function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function FieldTrackingPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({
    clocked_in: 0,
    total_staff: 0,
    visits_today: 0,
    collected_today: 0,
    not_clocked_in: 0,
  });

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await clientFetch(`/api/field-tracking?date=${encodeURIComponent(date)}`);
    if (!res.ok || !res.data?.success) {
      setAgents([]);
      setError(res.data?.message || res.error || "Could not load field staff.");
    } else {
      setAgents(res.data.agents ?? []);
      setSummary(res.data.summary ?? summary);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const loadDetail = useCallback(async () => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    const res = await clientFetch(
      `/api/field-tracking?agent_id=${encodeURIComponent(selected.id)}&date=${encodeURIComponent(date)}`
    );
    setDetail(res.ok && res.data?.success ? res.data : null);
    setDetailLoading(false);
  }, [selected, date]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  function refreshAll() {
    loadList();
    loadDetail();
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="badge mb-1.5 inline-flex items-center gap-1.5 bg-accent-light text-accent-dark">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#1E7E5E]" />
            LIVE TRACKING
          </span>
          <h1 className="font-display text-xl font-bold text-gray-800">📍 Field Staff Tracking</h1>
          <p className="text-xs text-gray-400">
            Real-time location · Route history · Field activity · Clock In/Out
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={refreshAll}>
          ⟳ Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Clocked In" value={summary.clocked_in} icon="👤" tone="accent" />
        <StatCard label="Total Field Staff" value={summary.total_staff} icon="👥" />
        <StatCard label="Visits Today" value={summary.visits_today} icon="📍" tone="info" />
        <StatCard label="Collected Today" value={fmtInr(summary.collected_today)} icon="💰" />
        <StatCard label="Not Clocked In" value={summary.not_clocked_in} icon="⏱️" tone="danger" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadList} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Left: agent list */}
          <div className="lg:h-[560px]">
            <AgentListPanel
              agents={agents}
              loading={loading}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          </div>

          {/* Right: map/route + tabs */}
          <div className="space-y-4">
            <RoutePanel
              agent={selected}
              date={date}
              onDateChange={setDate}
              detail={detail}
              loading={detailLoading}
              onRefresh={refreshAll}
            />
            <DetailTabs agent={selected} detail={detail} loading={detailLoading} />
          </div>
        </div>
      )}
    </>
  );
}
