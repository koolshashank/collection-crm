"use client";

const STATUS_META = {
  idle: { label: "Not run", cls: "border-line bg-surface text-gray-500" },
  running: { label: "Running…", cls: "border-info/40 bg-blue-50 text-info" },
  done: { label: "Completed", cls: "border-accent/40 bg-accent-light text-accent-dark" },
  error: { label: "Failed", cls: "border-danger/40 bg-[#fbeaea] text-[#9c2b2b]" },
};

export default function StepCard({ step, state, blocked, onRun, onExport, onPreview }) {
  const status = state?.status || "idle";
  const meta = STATUS_META[status];
  const rows = state?.rows ?? [];
  const isFetch = step.kind === "fetch";

  return (
    <div
      className={`card p-4 transition ${
        status === "running" ? "ring-2 ring-info/30" : status === "done" ? "ring-1 ring-accent/30" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Step number */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
            status === "done"
              ? "bg-accent text-white"
              : status === "error"
              ? "bg-danger text-white"
              : "bg-accent-light text-accent-dark"
          }`}
        >
          {status === "done" ? "✓" : step.step}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-bold text-gray-800">{step.title}</h3>
            <span className={`badge border ${meta.cls}`}>{meta.label}</span>
            {step.kind === "mutate" && (
              <span className="badge border border-amber/40 bg-[#fdf3e3] text-[10px] text-[#8a5a12]">
                Changes data
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>

          {/* Result line */}
          {status === "done" && (
            <p className="mt-1.5 text-xs font-semibold text-accent-dark">
              {isFetch
                ? `${(state.count ?? rows.length).toLocaleString("en-IN")} record${
                    (state.count ?? rows.length) === 1 ? "" : "s"
                  } fetched`
                : state.message || "Done"}
            </p>
          )}
          {status === "error" && (
            <p className="mt-1.5 text-xs text-danger">{state.message || "Something went wrong."}</p>
          )}
          {blocked && status === "idle" && (
            <p className="mt-1.5 text-xs text-gray-400">Run the previous step first.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isFetch && status === "done" && rows.length > 0 && (
            <>
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={onPreview}>
                Preview
              </button>
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={onExport}>
                ⬇ CSV
              </button>
            </>
          )}
          <button
            type="button"
            className={step.kind === "mutate" ? "btn-danger !py-1.5 text-xs" : "btn-primary !py-1.5 text-xs"}
            onClick={onRun}
            disabled={status === "running"}
          >
            {status === "running" ? "Running…" : status === "done" ? "Run again" : step.action}
          </button>
        </div>
      </div>
    </div>
  );
}
