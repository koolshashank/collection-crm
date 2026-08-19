"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
} from "chart.js";
import Modal from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { CiIcon } from "@/components/client-info/icons";
import { clientFetch } from "@/lib/clientFetch";
import DispositionTable from "./DispositionTable";
import { toneForCode, iconForLabel, descriptionForCode } from "./dispositionTones";
import { computeDispositionStats } from "./dispositionStats";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler);

const FETCH_LIMIT = 500;
const RECORDS_PAGE_SIZE = 25;

/* Fixed categorical order (never hashed) — these are always the same four
   buckets in the same order, so they always get the same color. */
const BUCKET_COLORS = ["#2563a8", "#0c7a70", "#e8a33d", "#7c3aed"];

const PROMISE_GROUPS = [
  { key: "overdue", label: "Overdue", color: "#c0392b" },
  { key: "today", label: "Today", color: "#e8a33d" },
  { key: "tomorrow", label: "Tomorrow", color: "#2563a8" },
  { key: "thisWeek", label: "This Week", color: "#0c7a70" },
  { key: "later", label: "Later", color: "#6b7280" },
];

function fmtInr(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function fmtDay(d) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function StatTile({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 truncate text-base font-bold" style={{ color: tone || "#1f2937" }}>
        {value}
      </div>
    </div>
  );
}

function AgentBars({ agents, max }) {
  if (agents.length === 0) {
    return <p className="text-[12.5px] text-gray-400">No agent data on these records.</p>;
  }
  return (
    <div className="space-y-3">
      {agents.map((a, i) => (
        <div key={a.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-gray-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-[10px] font-bold text-accent-dark">
                {i + 1}
              </span>
              <span className="truncate">{a.name}</span>
            </span>
            <span className="shrink-0 text-gray-500">{a.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark"
              style={{ width: `${max ? Math.max(4, (a.count / max) * 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Detail view for one disposition code — stat tiles + Overview / Records /
 * Agents / Trend tabs (plus Promise Date Analysis when the code carries
 * ptp_date, e.g. PTP/FPTP/BRPTP). Fetches every record for the code once
 * (small volumes at this app's scale) and derives everything client-side —
 * no stat here is fabricated, sections that need amount/date data hide
 * themselves when the code doesn't carry it.
 */
export default function DispositionCodeModal({ open, onClose, card }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [truncatedAt, setTruncatedAt] = useState(null);
  const [tab, setTab] = useState("overview");
  const [recordsPage, setRecordsPage] = useState(1);

  useEffect(() => {
    if (open) {
      setTab("overview");
      setRecordsPage(1);
    }
  }, [open, card?.code]);

  const load = useCallback(async () => {
    if (!open || !card?.code) return;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ page: "1", limit: String(FETCH_LIMIT), disposition_code: card.code });
    const res = await clientFetch(`/api/disposition/history?${qs.toString()}`);

    if (!res.ok || !res.data?.success) {
      setRows([]);
      setError(res.data?.message || res.error || "Could not load records.");
    } else {
      const fetched = res.data.rows ?? [];
      const total = Number(res.data.pagination?.totalItems) || fetched.length;
      setRows(fetched);
      setTruncatedAt(total > fetched.length ? total : null);
    }
    setLoading(false);
  }, [open, card?.code]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeDispositionStats(rows), [rows]);

  if (!card) return null;
  const tone = toneForCode(card.code);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "records", label: "Records" },
    { key: "agents", label: "Agents" },
    { key: "trend", label: "Trend" },
    ...(stats.hasDate ? [{ key: "promiseDates", label: "Promise Date Analysis" }] : []),
  ];

  const lineData = {
    labels: stats.dailySeries.map((d) => fmtDay(d.date)),
    datasets: [
      {
        data: stats.dailySeries.map((d) => d.count),
        borderColor: tone.text,
        backgroundColor: tone.bg,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: tone.text,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#16223c", padding: 8, displayColors: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: "rgba(226,229,234,.5)" } },
    },
  };

  const doughnutData = {
    labels: stats.amountBuckets.map((b) => b.label),
    datasets: [
      {
        data: stats.amountBuckets.map((b) => b.count),
        backgroundColor: BUCKET_COLORS,
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
      tooltip: { backgroundColor: "#16223c", padding: 8 },
    },
  };

  const weeklyData = {
    labels: stats.weeklySeries.map((w) => fmtDay(w.weekStart)),
    datasets: [
      {
        data: stats.weeklySeries.map((w) => w.count),
        backgroundColor: tone.text,
        hoverBackgroundColor: tone.text,
        borderRadius: 4,
        maxBarThickness: 34,
      },
    ],
  };
  const weeklyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#16223c",
        padding: 8,
        displayColors: false,
        callbacks: { title: (items) => `Week of ${items[0]?.label}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: "rgba(226,229,234,.5)" } },
    },
  };

  const maxAgentCount = stats.topAgents[0]?.count || 0;
  const totalRecordsPages = Math.max(1, Math.ceil(rows.length / RECORDS_PAGE_SIZE));
  const pagedRows = rows.slice((recordsPage - 1) * RECORDS_PAGE_SIZE, recordsPage * RECORDS_PAGE_SIZE);
  const maxPromiseGroup = Math.max(1, ...PROMISE_GROUPS.map((g) => stats.promiseGroups[g.key]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: tone.bg, color: tone.text }}
          >
            <CiIcon name={iconForLabel(card.label)} size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-bold text-gray-800">{card.label}</span>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide"
                style={{ background: tone.bg, color: tone.text }}
              >
                {card.code}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-normal text-gray-500">{descriptionForCode(card.code, card.label)}</p>
          </div>
        </div>
      }
    >
      {loading ? (
        <PageLoader label="Loading records…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState icon="🗂️" title="No records" hint={`Nothing found for ${card.code}.`} />
      ) : (
        <>
          {/* Stat tiles */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total Records" value={stats.totalRecords.toLocaleString("en-IN")} />
            <StatTile label="Unique Loans" value={stats.uniqueLoans.toLocaleString("en-IN")} />
            <StatTile label="Unique Agents" value={stats.uniqueAgents.toLocaleString("en-IN")} />
            {stats.hasAmount && (
              <>
                <StatTile label={`Total ${card.code} Amount`} value={fmtInr(stats.totalAmount)} tone={tone.text} />
                <StatTile label="Avg Promise Amount" value={fmtInr(stats.avgAmount)} tone={tone.text} />
              </>
            )}
          </div>

          {truncatedAt && (
            <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3.5 py-2 text-xs text-amber">
              Showing the first {rows.length.toLocaleString("en-IN")} of {truncatedAt.toLocaleString("en-IN")} records for
              this code — refine your search on the main page to reach older ones.
            </div>
          )}

          {/* Tab bar */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px whitespace-nowrap border-b-[2.5px] px-3.5 py-2 text-[12.5px] font-semibold uppercase tracking-wide transition ${
                  tab === t.key ? "border-accent text-accent-dark" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Disposition Over Time</h4>
                  <div className="h-[190px]">
                    <Line data={lineData} options={lineOptions} />
                  </div>
                  <p className="mt-2 text-[10.5px] text-gray-400">Last 30 days</p>
                </div>

                {stats.hasAmount ? (
                  <div className="rounded-xl border border-line p-4">
                    <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Amount Distribution</h4>
                    <div className="flex items-center gap-4">
                      <div className="relative h-[150px] w-[150px] shrink-0">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-gray-400">Total</span>
                          <span className="text-sm font-bold text-gray-800">{fmtInr(stats.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {stats.amountBuckets.map((b, i) => (
                          <div key={b.key} className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BUCKET_COLORS[i] }} />
                              <span className="truncate">{b.label}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-gray-800">
                              {b.count} ({stats.totalRecords ? Math.round((b.count / stats.totalRecords) * 100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-line p-4">
                    <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Top Agents</h4>
                    <AgentBars agents={stats.topAgents.slice(0, 5)} max={maxAgentCount} />
                  </div>
                )}
              </div>

              {(stats.hasDate || stats.hasAmount) && (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {stats.hasDate && (
                    <div className="rounded-xl border border-line p-4">
                      <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Upcoming Promise Dates</h4>
                      <div className="space-y-2">
                        {PROMISE_GROUPS.map((g) => (
                          <div key={g.key} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-[12.5px]">
                            <span className="text-gray-600">{g.label}</span>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                              style={{ background: g.color + "1a", color: g.color }}
                            >
                              {stats.promiseGroups[g.key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {stats.hasAmount && (
                    <div className="rounded-xl border border-line p-4">
                      <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Top Agents</h4>
                      <AgentBars agents={stats.topAgents.slice(0, 5)} max={maxAgentCount} />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-line p-4">
                <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Recent {card.label} Records</h4>
                <DispositionTable rows={stats.recent} hideCodeColumns />
                {rows.length > stats.recent.length && (
                  <button
                    type="button"
                    onClick={() => setTab("records")}
                    className="mt-3 w-full rounded-lg border border-line py-2 text-[12.5px] font-semibold text-accent-dark transition hover:bg-accent-light"
                  >
                    View All {rows.length.toLocaleString("en-IN")} {card.label} Records
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── RECORDS ── */}
          {tab === "records" && (
            <div>
              <DispositionTable rows={pagedRows} startIndex={(recordsPage - 1) * RECORDS_PAGE_SIZE} hideCodeColumns />
              {totalRecordsPages > 1 && (
                <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-line pt-3">
                  <span className="text-xs text-gray-500">
                    Page {recordsPage} of {totalRecordsPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={recordsPage <= 1}
                      onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                    >
                      ‹ Prev
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={recordsPage >= totalRecordsPages}
                      onClick={() => setRecordsPage((p) => Math.min(totalRecordsPages, p + 1))}
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AGENTS ── */}
          {tab === "agents" && (
            <div className="rounded-xl border border-line p-4">
              <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">
                All Agents ({stats.topAgents.length})
              </h4>
              <AgentBars agents={stats.topAgents} max={maxAgentCount} />
            </div>
          )}

          {/* ── TREND ── */}
          {tab === "trend" && (
            <div className="rounded-xl border border-line p-4">
              <h4 className="mb-3 text-[12.5px] font-bold text-gray-800">Weekly Trend — Last 12 Weeks</h4>
              <div className="h-[260px]">
                <Bar data={weeklyData} options={weeklyOptions} />
              </div>
              <p className="mt-2 text-[10.5px] text-gray-400">Each bar is the week starting on the date shown</p>
            </div>
          )}

          {/* ── PROMISE DATE ANALYSIS ── */}
          {tab === "promiseDates" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PROMISE_GROUPS.map((g) => (
                <div key={g.key} className="rounded-xl border border-line p-4 text-center">
                  <div
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: g.color + "1a", color: g.color }}
                  >
                    <CiIcon name="cal" size={16} strokeWidth={2} />
                  </div>
                  <div className="mt-2 text-2xl font-bold" style={{ color: g.color }}>
                    {stats.promiseGroups[g.key]}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-gray-500">{g.label}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (stats.promiseGroups[g.key] / maxPromiseGroup) * 100)}%`,
                        background: g.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
