"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { firstOfMonthISO, fmtInr, todayISO } from "./format";
import {
  Panel,
  PanelHead,
  SectionLabel,
  StatsStrip,
  WidgetError,
  WidgetLoading,
  useApi,
} from "./shared";
import QuickActions from "./QuickActions";

/* Same rank colouring as tp_rank_class() */
const RANK_CLASS = ["text-amber", "text-slate-400", "text-orange-600"];

function Avatar({ name, danger }) {
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg font-display text-[0.72rem] font-bold text-white"
      style={{
        background: danger
          ? "linear-gradient(135deg,#f5c6c6,#d64545)"
          : "linear-gradient(135deg,#e6f6f4,#0f9b8e)",
      }}
    >
      {initial}
    </div>
  );
}

function AgentRow({ index, e, bottom }) {
  const pct = Number(e.collectionPercent ?? 0);
  const col = bottom
    ? "#d64545"
    : pct >= 100
      ? "#1E7E5E"
      : pct >= 50
        ? "#e8a33d"
        : "#d64545";
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-accent/5 sm:px-5">
      <span
        className={`min-w-[20px] text-center text-[0.72rem] font-bold ${bottom ? "text-danger" : RANK_CLASS[index] || "text-gray-400"}`}
      >
        {index + 1}
      </span>
      <Avatar name={e.employeeName} danger={bottom} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.79rem] font-semibold text-gray-800">
          {e.employeeName || ""}
        </div>
        <div className="mt-px text-[0.66rem] text-gray-400">
          TL: {e.tlName || "—"} · {parseInt(e.assignedLeads ?? 0, 10) || 0}{" "}
          leads
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[0.75rem] font-bold" style={{ color: col }}>
          {pct.toFixed(1)}%
        </div>
        <div className="mt-px text-[0.64rem] text-gray-400">
          {bottom
            ? `${fmtInr(Number(e.assignedAmount ?? 0))} assigned`
            : fmtInr(Number(e.collectedAmount ?? 0))}
        </div>
      </div>
    </div>
  );
}

/**
 * Top Performers & Non-Performers — mirror of dashboard.php's
 * top-performers section: tp_start/tp_end date-range filter mirrored in
 * the URL, Top 5 / Bottom 5 panels, same stats strips.
 */
export default function TopPerformers() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tpStart = searchParams.get("tp_start") || firstOfMonthISO();
  const tpEnd = searchParams.get("tp_end") || todayISO();
  const hasFilter = searchParams.has("tp_start") || searchParams.has("tp_end");

  const [draftStart, setDraftStart] = useState(tpStart);
  const [draftEnd, setDraftEnd] = useState(tpEnd);

  const { loading, error, data, reload } = useApi(
    `/api/dashboard/top-performers?startDate=${encodeURIComponent(tpStart)}&endDate=${encodeURIComponent(tpEnd)}&limit=5`,
  );
  const top5 = Array.isArray(data?.top5) ? data.top5 : [];
  const bottom5 = Array.isArray(data?.bottom5) ? data.bottom5 : [];

  function apply(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("tp_start", draftStart);
    params.set("tp_end", draftEnd);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  function reset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tp_start");
    params.delete("tp_end");
    setDraftStart(firstOfMonthISO());
    setDraftEnd(todayISO());
    router.replace(
      `/dashboard${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false },
    );
  }

  const body = (list, bottom) =>
    loading ? (
      <WidgetLoading label="Loading…" />
    ) : error ? (
      <WidgetError message={error} onRetry={reload} />
    ) : list.length === 0 ? (
      <div className="px-4 py-8 text-center text-[0.8rem] text-gray-400">
        {bottom
          ? "No data for this period."
          : "No performer data for this period."}
      </div>
    ) : (
      <>
        {list.map((e, i) => (
          <AgentRow
            key={`${e.employeeName || "agent"}-${i}`}
            index={i}
            e={e}
            bottom={bottom}
          />
        ))}
        <StatsStrip
          items={
            bottom
              ? [
                  {
                    value: String(list.length),
                    label: "Flagged Agents",
                    color: "#d64545",
                  },
                  {
                    value: fmtInr(
                      list.reduce(
                        (s, e) => s + Number(e.assignedAmount ?? 0),
                        0,
                      ),
                    ),
                    label: "Total Assigned",
                  },
                ]
              : [
                  {
                    value: `${Number(list[0]?.collectionPercent ?? 0).toFixed(1)}%`,
                    label: "Top Score",
                    color: "#1E7E5E",
                  },
                  {
                    value: fmtInr(
                      list.reduce(
                        (s, e) => s + Number(e.collectedAmount ?? 0),
                        0,
                      ),
                    ),
                    label: "Total Collected",
                  },
                ]
          }
        />
      </>
    );

  return (
    <>
      <SectionLabel
        right={
          <form
            onSubmit={apply}
            className="flex flex-wrap items-center gap-1.5"
          >
            <input
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              className="input w-auto px-2 py-1 text-[0.72rem]"
              aria-label="Start date"
            />
            <span className="text-[0.7rem] text-gray-400">to</span>
            <input
              type="date"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="input w-auto px-2 py-1 text-[0.72rem]"
              aria-label="End date"
            />
            <button
              type="submit"
              className="btn-primary px-3 py-1 text-[0.72rem]"
            >
              Apply
            </button>
            {hasFilter && (
              <button
                type="button"
                onClick={reset}
                className="btn-secondary px-2.5 py-1 text-[0.72rem]"
              >
                Reset
              </button>
            )}
          </form>
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3 w-3"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Top Performers &amp; Non-Performers
      </SectionLabel>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHead
            title={
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 text-accent"
                >
                  <path d="M8 21h8M12 17v4M17 3H7v6a5 5 0 0010 0V3z" />
                  <path d="M17 5h3a2 2 0 010 4h-1M7 5H4a2 2 0 000 4h1" />
                </svg>
                Top 5 Performers
              </>
            }
            link={
              <Link
                href="/performance-report"
                className="text-[0.72rem] font-semibold text-accent hover:underline"
              >
                Full Ranking →
              </Link>
            }
          />
          {body(top5, false)}
        </Panel>

        <Panel>
          <PanelHead
            title={
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 text-accent"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Top 5 Non-Performers
              </>
            }
            link={
              <Link
                href="/performance-report"
                className="text-[0.72rem] font-semibold text-accent hover:underline"
              >
                Full Ranking →
              </Link>
            }
          />
          {body(bottom5, true)}
        </Panel>

        <QuickActions />
      </div>
    </>
  );
}
