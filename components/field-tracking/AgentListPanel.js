"use client";

import { useMemo, useState } from "react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function fmtTime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function AgentListPanel({ agents, loading, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const visible = useMemo(() => {
    let list = agents;
    if (filter === "active") list = list.filter((a) => a.clocked_in);
    if (filter === "inactive") list = list.filter((a) => !a.clocked_in);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) =>
        [a.name, a.id, a.email, a.mobile].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [agents, filter, query]);

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="border-b border-line p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-sm">👤</span>
          <h3 className="font-display text-sm font-bold text-gray-800">Field Agents</h3>
          <span className="badge bg-accent-light text-accent-dark">{agents.length}</span>
        </div>

        <input
          type="text"
          className="input !py-1.5 text-xs"
          placeholder="Search agent name or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                filter === f.key
                  ? "border-accent bg-accent-light text-accent-dark"
                  : "border-line bg-panel text-gray-500 hover:border-accent hover:text-accent-dark"
              }`}
            >
              {f.key === "active" && <span className="mr-1 text-[#1E7E5E]">●</span>}
              {f.key === "inactive" && <span className="mr-1 text-gray-400">●</span>}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No agents match.</div>
        ) : (
          visible.map((a) => {
            const active = selectedId === a.id;
            const inAt = fmtTime(a.clock_in_at);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a)}
                className={`flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-left transition last:border-0 ${
                  active ? "bg-accent-light" : "hover:bg-accent-light/40"
                }`}
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-light to-accent text-xs font-bold text-white">
                  {String(a.name || "?").trim().substring(0, 1).toUpperCase()}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      a.clocked_in ? "bg-[#1E7E5E]" : "bg-gray-300"
                    }`}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-gray-800">{a.name}</span>
                  <span className="block truncate text-[10px] text-gray-400">
                    {a.clocked_in ? `Clocked in${inAt ? ` · ${inAt}` : ""}` : "Not clocked in"}
                  </span>
                </span>

                {a.visits_today > 0 && (
                  <span className="badge shrink-0 bg-accent-light text-[10px] text-accent-dark">
                    {a.visits_today}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
