"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

const CR = 1_00_00_000; // 1 crore in rupees

function fmtCr(rupees) {
  const cr = Number(rupees || 0) / CR;
  return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}Cr`;
}

function pct(achieved, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((achieved / target) * 1000) / 10);
}

/**
 * Monthly Target — sits at the very top of the Dashboard.
 * Overall / Fresh / Reloan collection achieved vs this month's target.
 *
 * Achieved amounts come from the same source CoreKpis already uses
 * (adminDashCollection.total + .percentages.fresh/.reloan) — passed in as
 * props so this doesn't re-fetch. Targets themselves are admin-set (no
 * backend concept of a "target") via the edit pencil, stored through
 * /api/dashboard/target.
 */
export default function MonthlyTarget({ totalCollected, freshCollected, reloanCollected, canEdit }) {
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ total: "", fresh: "", reloan: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    clientFetch("/api/dashboard/target").then((res) => {
      if (cancelled) return;
      const t = res.data?.target || { total_target: 0, fresh_target: 0, reloan_target: 0 };
      setTarget(t);
      setForm({
        total: t.total_target ? String(t.total_target / CR) : "",
        fresh: t.fresh_target ? String(t.fresh_target / CR) : "",
        reloan: t.reloan_target ? String(t.reloan_target / CR) : "",
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    const body = {
      total_target: Math.round((parseFloat(form.total) || 0) * CR),
      fresh_target: Math.round((parseFloat(form.fresh) || 0) * CR),
      reloan_target: Math.round((parseFloat(form.reloan) || 0) * CR),
    };
    const res = await fetch("/api/dashboard/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (data.success) {
      setTarget(data.target);
      setEditing(false);
    } else {
      alert(data.message || "Failed to save target.");
    }
  }

  if (loading) {
    return <div className="card mb-4 h-[110px] animate-pulse bg-surface" />;
  }

  const totalTarget = target?.total_target || 0;
  const freshTarget = target?.fresh_target || 0;
  const reloanTarget = target?.reloan_target || 0;
  const noTargetSet = totalTarget === 0 && freshTarget === 0 && reloanTarget === 0;

  const tiles = [
    { label: "Overall", achieved: totalCollected, target: totalTarget },
    { label: "Fresh", achieved: freshCollected, target: freshTarget },
    { label: "Reloan", achieved: reloanCollected, target: reloanTarget },
  ];

  return (
    <div className="card mb-4 grid grid-cols-1 gap-0 overflow-hidden sm:grid-cols-4">
      {/* Label tile */}
      <div className="flex flex-col justify-center gap-1 border-b border-line p-4 sm:border-b-0 sm:border-r">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Monthly Target</div>
        <div className="font-display text-lg font-bold text-gray-800">Collection</div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1 w-fit text-[11px] font-semibold text-accent-dark hover:underline"
          >
            {noTargetSet ? "+ Set target" : "✎ Edit target"}
          </button>
        )}
      </div>

      {/* Overall / Fresh / Reloan tiles */}
      {tiles.map((t, i) => {
        const p = pct(t.achieved, t.target);
        return (
          <div key={t.label} className={`p-4 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{t.label}</span>
              <span className="rounded-full bg-[#fdf1f0] px-2 py-0.5 text-xs font-bold text-danger">{p}%</span>
            </div>
            <div className="text-base font-bold text-gray-800">
              {fmtCr(t.achieved)} <span className="font-normal text-gray-400">/ {t.target ? fmtCr(t.target) : "—"}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#fbe4e2]">
              <div className="h-full rounded-full bg-danger transition-all duration-700" style={{ width: `${p}%` }} />
            </div>
          </div>
        );
      })}

      {editing && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-navy/50 p-4">
          <div className="card w-full max-w-sm p-5">
            <h3 className="mb-3 font-display text-base font-bold text-gray-800">Set Monthly Target</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Overall Target (₹ Cr)</label>
                <input
                  type="number"
                  className="input"
                  value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                  placeholder="e.g. 60"
                />
              </div>
              <div>
                <label className="label">Fresh Target (₹ Cr)</label>
                <input
                  type="number"
                  className="input"
                  value={form.fresh}
                  onChange={(e) => setForm((f) => ({ ...f, fresh: e.target.value }))}
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <label className="label">Reloan Target (₹ Cr)</label>
                <input
                  type="number"
                  className="input"
                  value={form.reloan}
                  onChange={(e) => setForm((f) => ({ ...f, reloan: e.target.value }))}
                  placeholder="e.g. 30"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
