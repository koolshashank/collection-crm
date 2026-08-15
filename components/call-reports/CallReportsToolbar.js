"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

export default function CallReportsToolbar({ filters, onApply, onClear }) {
  const [search, setSearch] = useState(filters.search);
  const [disposition, setDisposition] = useState(filters.disposition);
  const [agent, setAgent] = useState(filters.agent);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [facets, setFacets] = useState({ dispositions: [], agents: [] });

  useEffect(() => {
    setSearch(filters.search);
    setDisposition(filters.disposition);
    setAgent(filters.agent);
    setFrom(filters.from);
    setTo(filters.to);
  }, [filters]);

  useEffect(() => {
    let alive = true;
    clientFetch("/api/call-reports/facets").then((res) => {
      if (alive && res.ok && res.data?.success) {
        setFacets({ dispositions: res.data.dispositions ?? [], agents: res.data.agents ?? [] });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  function submit(e) {
    e?.preventDefault();
    onApply({ search, disposition, agent, from, to });
  }

  return (
    <form onSubmit={submit} className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Lead ID, mobile, call ref, agent…"
          className="input"
        />
      </div>

      <div className="w-44">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Disposition</label>
        <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className="input">
          <option value="">All</option>
          {facets.dispositions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="w-44">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Agent</label>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="input">
          <option value="">All</option>
          {facets.agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-semibold text-gray-500">From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs font-semibold text-gray-500">To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          Apply
        </button>
        <button type="button" className="btn-secondary" onClick={onClear}>
          Clear
        </button>
      </div>
    </form>
  );
}
