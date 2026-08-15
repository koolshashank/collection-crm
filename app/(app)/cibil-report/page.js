"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/Feedback";
import { CIBIL_STEPS } from "@/lib/cibil/steps";
import { downloadCsv } from "@/lib/cibil/csv";
import StepCard from "@/components/cibil/StepCard";
import PreviewModal from "@/components/cibil/PreviewModal";

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function CibilReportPage() {
  const toast = useToast();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // { [stepKey]: { status, rows, count, message } }
  const [states, setStates] = useState({});
  const [preview, setPreview] = useState(null);

  function setStepState(key, patch) {
    setStates((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }));
  }

  async function runStep(step) {
    if (!from || !to) return toast.error("Pick a date range first.");
    if (from > to) return toast.error("“From” date can't be after “To” date.");
    if (step.confirm && !confirm(step.confirm)) return;

    setStepState(step.key, { status: "running", message: null });

    const qs = new URLSearchParams({ from, to });
    const url = `/api/cibil/${step.key}?${qs.toString()}`;
    const isPost = (step.method || "GET").toUpperCase() === "POST";

    try {
      const res = await fetch(url, {
        method: isPost ? "POST" : "GET",
        headers: isPost ? { "Content-Type": "application/json" } : undefined,
        body: isPost ? JSON.stringify({}) : undefined,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setStepState(step.key, {
          status: "error",
          message: data.message || `Request failed (HTTP ${res.status}).`,
        });
        // A not-yet-connected endpoint isn't a failure worth a red toast.
        if (!data.notConnected) toast.error(data.message || "Step failed.");
        return;
      }

      setStepState(step.key, {
        status: "done",
        rows: data.rows ?? [],
        count: data.count ?? (data.rows ?? []).length,
        message: data.message,
      });
      toast.success(
        step.kind === "fetch"
          ? `Step ${step.step}: ${(data.count ?? 0).toLocaleString("en-IN")} records fetched`
          : `Step ${step.step} completed`
      );
    } catch (err) {
      setStepState(step.key, { status: "error", message: err?.message || "Network error." });
      toast.error("Network error.");
    }
  }

  function exportStep(step) {
    const rows = states[step.key]?.rows ?? [];
    if (rows.length === 0) return toast.error("Nothing to export — run the step first.");
    const name = `${step.exportName || step.key}_${from}_to_${to}`;
    downloadCsv(rows, name);
    toast.success("CSV downloaded");
  }

  const doneCount = CIBIL_STEPS.filter((s) => states[s.key]?.status === "done").length;

  return (
    <>
      <PageHeader
        title="CIBIL Report"
        subtitle="Run the reporting pipeline step by step and export the results"
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStates({})}
            disabled={doneCount === 0}
          >
            Reset Progress
          </button>
        }
      />

      {/* Date range */}
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="w-44">
          <label className="label">From Date</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="label">To Date</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex-1 text-right text-xs text-gray-400">
          <span className="font-semibold text-gray-700">{doneCount}</span> of {CIBIL_STEPS.length} steps
          completed
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {CIBIL_STEPS.map((step) => {
          const blocked =
            Boolean(step.dependsOn) && states[step.dependsOn]?.status !== "done";
          return (
            <StepCard
              key={step.key}
              step={step}
              state={states[step.key]}
              blocked={blocked}
              onRun={() => {
                if (blocked && !confirm("The previous step hasn't been run. Continue anyway?")) return;
                runStep(step);
              }}
              onExport={() => exportStep(step)}
              onPreview={() => setPreview(step)}
            />
          );
        })}
      </div>

      <PreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `Step ${preview.step} — ${preview.title}` : ""}
        rows={preview ? states[preview.key]?.rows ?? [] : []}
        onExport={() => preview && exportStep(preview)}
      />
    </>
  );
}
