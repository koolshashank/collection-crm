"use client";

import { useState } from "react";
import { postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

/**
 * Round Robin Distribution card — mirror of assign_lead.php's RR section.
 * POSTs { lead_limit, chunk_size } to /api/assign/round-robin (port of
 * round_robin_assign.php) and renders the per-agent result rows.
 */
export default function RoundRobinCard({ onDistributed }) {
  const { success, error } = useToast();
  const [scope, setScope] = useState("all"); // all | custom
  const [customCount, setCustomCount] = useState("");
  const [chunkSize, setChunkSize] = useState("1");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null); // { pending } | round robin response | { failed:msg }

  async function distribute() {
    const useCustom = scope === "custom";
    const leadLimit = useCustom ? parseInt(customCount, 10) : null;
    const chunk = parseInt(chunkSize, 10) || 1;

    if (useCustom && (!leadLimit || leadLimit < 1)) {
      error("Enter a valid number of leads first.");
      return;
    }

    const scopeMsg = leadLimit ? `the first ${leadLimit} unassigned leads` : "every unassigned lead in the system";
    if (
      !window.confirm(
        `This will fetch ${scopeMsg} and distribute them across every Collection Executive, ${chunk} at a time per agent. Continue?`
      )
    )
      return;

    setWorking(true);
    setResult({ pending: true });

    const res = await postJson("/api/assign/round-robin", { lead_limit: leadLimit, chunk_size: chunk }, 300000);
    setWorking(false);

    const data = res.data && typeof res.data === "object" ? res.data : null;
    if (!data || !data.agents || !data.agents.length) {
      const msg = data?.message || res.error || "Nothing to distribute.";
      setResult({ failed: msg });
      error(msg);
      return;
    }

    setResult(data);
    if (data.success) {
      success(data.message || `${data.total_leads} leads distributed successfully ✓`);
      setTimeout(() => onDistributed?.(), 1600);
    } else {
      error(data.message || "Some agent groups failed — check details below.");
    }
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-accent">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          Round Robin Distribution
        </div>
        <div className="ml-6 mt-1 text-xs text-gray-500">
          Distributes every unassigned lead in the system evenly across every <strong>Collection Executive</strong>, in
          rotation — one click, no selection needed.
        </div>
      </div>

      <div className="p-5">
        {/* Option 1: how many leads */}
        <div className="mb-4 border-b border-dashed border-line pb-4">
          <div className="mb-2.5 text-xs font-bold text-gray-800">How many leads to assign?</div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600">
              <input
                type="radio"
                name="rr-scope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                className="h-4 w-4 accent-accent"
              />
              All unassigned leads
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600">
              <input
                type="radio"
                name="rr-scope"
                value="custom"
                checked={scope === "custom"}
                onChange={() => setScope("custom")}
                className="h-4 w-4 accent-accent"
              />
              Only
              <input
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={customCount}
                disabled={scope !== "custom"}
                onChange={(e) => {
                  setCustomCount(e.target.value);
                  if (e.target.value) setScope("custom");
                }}
                className="input w-[90px] text-center font-semibold disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-400"
              />
              leads
            </label>
          </div>
        </div>

        {/* Option 2: chunk size */}
        <div className="mb-4 border-b border-dashed border-line pb-4">
          <div className="mb-2.5 text-xs font-bold text-gray-800">Leads per agent, per round</div>
          <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} className="input w-full max-w-[420px]">
            <option value="1">1 — classic round robin (1 each, then next agent)</option>
            <option value="2">2 — 2 leads each before moving to next agent</option>
            <option value="3">3 — 3 leads each before moving to next agent</option>
            <option value="4">4 — 4 leads each before moving to next agent</option>
            <option value="5">5 — 5 leads each before moving to next agent</option>
            <option value="10">10 — 10 leads each before moving to next agent</option>
          </select>
          <div className="mt-2 text-xs text-gray-500">
            e.g. picking 2 gives Agent 1 → 2 leads, Agent 2 → 2 leads, Agent 3 → 2 leads, then back to Agent 1 → 2 more…
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-line pt-3.5">
          <div className="text-sm text-gray-600">
            This will fetch <strong className="text-accent-dark">all unassigned leads</strong> (every page) and split them
            across every employee whose designation is <strong className="text-accent-dark">COLLECTION-EXECUTIVE</strong> —
            Team Leads, Admins and other roles are skipped.
          </div>
          <button type="button" className="btn-primary" onClick={distribute} disabled={working}>
            {working ? (
              <span className="flex items-center gap-2">
                <Spinner size={14} className="border-white border-t-transparent" /> Fetching leads &amp; distributing…
              </span>
            ) : (
              "Distribute via Round Robin"
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-3.5 border-t border-dashed border-line pt-3.5">
            {result.pending ? (
              <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="font-semibold text-gray-800">Fetching unassigned leads and employees…</span>
                <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-bold text-accent-dark">Working…</span>
              </div>
            ) : result.failed ? (
              <div className="py-1.5 text-sm font-semibold text-danger">{result.failed}</div>
            ) : (
              <>
                <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-dashed border-line pb-2.5 text-sm">
                  <span className="font-semibold text-gray-800">
                    {result.total_leads} leads → {result.total_agents} agents
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      result.success ? "bg-accent-light text-accent-dark" : "bg-red-50 text-danger"
                    }`}
                  >
                    {result.success ? "Done ✓" : "Partial"}
                  </span>
                </div>
                {result.agents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="font-semibold text-gray-800">
                      {a.name} <small className="font-normal text-gray-400">({a.count} leads)</small>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        a.success ? "bg-accent-light text-accent-dark" : "bg-red-50 text-danger"
                      }`}
                    >
                      {a.success ? "Assigned ✓" : "Failed"}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
