"use client";

function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const TILE_COLORS = [
  { bg: "#eef6fd", border: "#bcd8f5", text: "#2563a8" }, // Fresh — light blue
  { bg: "#fdf6e9", border: "#f0d9a8", text: "#8a5a12" }, // Reloan — light amber
];

export default function TeamPerformanceCard({ team, onEdit, onDelete }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-base font-bold text-gray-800">
            {team.name}
            {team.lead_name ? <span className="font-normal text-gray-400"> ({team.lead_name})</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-accent-light text-accent-dark">{team.emp_count} Emp</span>
          <button
            type="button"
            onClick={() => onEdit(team)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            title="Edit team"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(team)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-[#fbeaea] hover:text-danger"
            title="Delete team"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Total Sanction</div>
        <div className="font-display text-2xl font-bold text-accent-dark">{fmtInr(team.total_sanction)}</div>
        <div className="mt-1 text-xs text-gray-500">
          Sanction / Loan: <strong className="text-gray-700">{fmtInr(team.sanction_per_loan)}</strong>
        </div>
        <div className="text-xs text-gray-500">
          Sanction / Emp (total ÷ {team.emp_count || 0}):{" "}
          <strong className="text-gray-700">{fmtInr(team.sanction_per_emp)}</strong>
        </div>
      </div>

      {team.partial_data && (
        <div className="mb-3 rounded-lg bg-[#fdf6e9] px-2.5 py-1.5 text-[11px] font-semibold text-[#8a5a12]">
          ⚠ Some agents' data couldn't be fetched — numbers may be incomplete.
        </div>
      )}

      <div className="border-t border-line pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Tile tone={TILE_COLORS[0]} label="Fresh Share" value={`${team.fresh_share_pct.toFixed(2)}%`} />
          <Tile tone={TILE_COLORS[1]} label="Reloan Share" value={`${team.reloan_share_pct.toFixed(2)}%`} />
          <Tile tone={TILE_COLORS[0]} label="Fresh Sanction" value={fmtInr(team.fresh_sanction)} />
          <Tile tone={TILE_COLORS[1]} label="Reloan Sanction" value={fmtInr(team.reloan_sanction)} />
          <Tile tone={TILE_COLORS[0]} label="Fresh Loans" value={team.fresh_loans} />
          <Tile tone={TILE_COLORS[1]} label="Reloan Loans" value={team.reloan_loans} />
        </div>
      </div>
    </div>
  );
}

function Tile({ tone, label, value }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: tone.bg, borderColor: tone.border }}>
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-0.5 text-base font-bold" style={{ color: tone.text }}>
        {value}
      </div>
    </div>
  );
}
