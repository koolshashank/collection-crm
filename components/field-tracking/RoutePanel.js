"use client";

function fmtTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Location panel.
 *
 * ⚠️ Deliberately NOT an embedded map. There's no location feed yet (see
 * lib/fieldTrackingStore), so there'd be nothing to plot — and adding a
 * maps SDK means an API key and a billing account decision that hasn't
 * been made. Once pings start arriving, this is the one component to swap
 * for a real map; the route points are already in the shape a map needs
 * ({ lat, lng, timestamp }).
 */
export default function RoutePanel({ agent, date, onDateChange, detail, loading, onRefresh }) {
  const status = detail?.status;
  const route = status?.route ?? [];
  const lastPing = status?.last_ping;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-display text-sm font-bold text-gray-800">
            {agent ? agent.name : "Select an agent"}
          </h3>
          <p className="text-[11px] text-gray-400">
            {agent ? "Live location · route history" : "Click any agent from the list to track"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Track route on</span>
          <input
            type="date"
            className="input !w-auto !py-1 text-xs"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-gray-500 transition hover:border-accent hover:text-accent-dark"
            title="Refresh"
          >
            ⟳
          </button>
        </div>
      </div>

      {agent && (
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2 text-[11px]">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status?.clocked_in ? "bg-[#1E7E5E]" : "bg-gray-300"
            }`}
          />
          <span className={status?.clocked_in ? "font-semibold text-[#1E7E5E]" : "text-gray-500"}>
            {status?.clocked_in ? "Clocked in" : "Not clocked in today"}
          </span>
          {status?.clock_in_at && (
            <span className="text-gray-400">· In {fmtTime(status.clock_in_at)}</span>
          )}
          {status?.clock_out_at && (
            <span className="text-gray-400">· Out {fmtTime(status.clock_out_at)}</span>
          )}
        </div>
      )}

      <div className="flex min-h-[220px] items-center justify-center p-8">
        {!agent ? (
          <div className="text-center">
            <div className="mx-auto mb-2 text-3xl opacity-40">📍</div>
            <p className="max-w-[260px] text-xs text-gray-400">
              Select an agent from the list to view their location and route.
            </p>
          </div>
        ) : loading ? (
          <p className="text-xs text-gray-400">Loading route…</p>
        ) : route.length === 0 ? (
          <div className="text-center">
            <div className="mx-auto mb-2 text-3xl opacity-40">🛰️</div>
            <p className="max-w-[320px] text-xs text-gray-400">
              No location data for {agent.name} on this date. Location pings will appear here once
              field agents start reporting from the mobile app.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-3 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                <strong className="text-gray-800">{route.length}</strong> location points
              </span>
              {lastPing && <span>Last seen {fmtTime(lastPing.timestamp)}</span>}
            </div>
            <ol className="max-h-[240px] space-y-2 overflow-y-auto border-l-2 border-accent-light pl-3.5">
              {route.map((p, i) => (
                <li key={i} className="text-xs">
                  <span className="font-semibold text-gray-800">{fmtTime(p.timestamp)}</span>
                  <span className="ml-2 text-gray-500">
                    {Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}
                  </span>
                  {p.accuracy ? (
                    <span className="ml-2 text-gray-400">±{Math.round(p.accuracy)}m</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
