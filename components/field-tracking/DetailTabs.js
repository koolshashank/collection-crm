"use client";

import { useState } from "react";

const TABS = [
  { key: "summary", label: "Field Summary", icon: "📊" },
  { key: "activity", label: "Activity Log", icon: "📝" },
  { key: "route", label: "Route Info", icon: "🗺️" },
];

function fmtTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

export default function DetailTabs({ agent, detail, loading }) {
  const [tab, setTab] = useState("summary");

  const empty = (text) => (
    <div className="p-10 text-center text-xs text-gray-400">{text}</div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              tab === t.key
                ? "border-accent bg-accent-light/40 text-accent-dark"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {!agent ? (
        empty("Select an agent to see their field summary.")
      ) : loading ? (
        empty("Loading…")
      ) : tab === "summary" ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Visits Assigned" value={detail?.summary?.visits_assigned ?? 0} />
            <Stat label="Visits Completed" value={detail?.summary?.visits_completed ?? 0} />
            <Stat label="Clock In" value={fmtTime(detail?.status?.clock_in_at)} />
            <Stat label="Clock Out" value={fmtTime(detail?.status?.clock_out_at)} />
          </div>

          <h4 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Visits on this date
          </h4>
          {(detail?.visits ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">No visits assigned to {agent.name} on this date.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface text-left text-gray-500">
                    <th className="px-3 py-1.5 font-semibold">Lead / Loan</th>
                    <th className="px-3 py-1.5 font-semibold">Customer</th>
                    <th className="px-3 py-1.5 font-semibold">Priority</th>
                    <th className="px-3 py-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.visits.map((v) => (
                    <tr key={v.id} className="border-t border-line">
                      <td className="px-3 py-1.5 font-semibold text-accent-dark">
                        {v.lead_id || v.loan_id || "--"}
                      </td>
                      <td className="px-3 py-1.5 text-gray-700">{v.customer_name || "--"}</td>
                      <td className="px-3 py-1.5 capitalize text-gray-600">{v.priority}</td>
                      <td className="px-3 py-1.5 capitalize text-gray-600">{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === "activity" ? (
        (detail?.activity ?? []).length === 0 ? (
          empty(
            "No activity recorded for this agent on this date. Entries appear here once the field app starts reporting."
          )
        ) : (
          <ol className="divide-y divide-line">
            {detail.activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="w-14 shrink-0 text-[11px] font-semibold text-gray-400">
                  {fmtTime(a.timestamp)}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold capitalize text-gray-800">{a.type}</span>
                  {a.detail && <span className="block text-[11px] text-gray-500">{a.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )
      ) : (detail?.status?.route ?? []).length === 0 ? (
        empty("No route recorded for this date.")
      ) : (
        <div className="p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Location Points" value={detail.status.route.length} />
            <Stat label="First Ping" value={fmtTime(detail.status.route[0]?.timestamp)} />
            <Stat
              label="Last Ping"
              value={fmtTime(detail.status.route[detail.status.route.length - 1]?.timestamp)}
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface text-left text-gray-500">
                  <th className="px-3 py-1.5 font-semibold">Time</th>
                  <th className="px-3 py-1.5 font-semibold">Latitude</th>
                  <th className="px-3 py-1.5 font-semibold">Longitude</th>
                  <th className="px-3 py-1.5 font-semibold">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {detail.status.route.map((p, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-1.5 text-gray-700">{fmtTime(p.timestamp)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-gray-600">{Number(p.lat).toFixed(6)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-gray-600">{Number(p.lng).toFixed(6)}</td>
                    <td className="px-3 py-1.5 text-gray-500">
                      {p.accuracy ? `±${Math.round(p.accuracy)}m` : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
