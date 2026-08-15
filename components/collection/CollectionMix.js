"use client";

import { coInr } from "./format";

/**
 * Collection Mix proportion bar — mirror of collection.php's .co-mix block
 * (Pre / On-time / Post share of the total, same legend labels).
 */
export default function CollectionMix({ summary }) {
  const kPre = Number(summary?.pre_collection ?? 0);
  const kOn = Number(summary?.ontime_collection ?? 0);
  const kPost = Number(summary?.post_collection ?? 0);
  const kTotal = Number(summary?.total_collection ?? 0);

  const prePct = kTotal > 0 ? Math.round((kPre / kTotal) * 1000) / 10 : 0;
  const onPct = kTotal > 0 ? Math.round((kOn / kTotal) * 1000) / 10 : 0;
  const postPct = kTotal > 0 ? Math.round((kPost / kTotal) * 1000) / 10 : 0;

  const legend = [
    { name: "Pre", pct: prePct, color: "#0f9b8e" },
    { name: "On-time", pct: onPct, color: "#1E7E5E" },
    { name: "Post", pct: postPct, color: "#e8a33d" },
  ];

  return (
    <div className="card mb-4 px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[0.78rem] font-bold text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-accent">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          Collection Mix
        </div>
        <div className="flex flex-wrap gap-4">
          {legend.map((l) => (
            <div key={l.name} className="flex items-center gap-1.5 text-[0.74rem] text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.name} <strong className="text-gray-800">{l.pct}%</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-lg bg-surface">
        {kTotal > 0 ? (
          <>
            <div className="transition-all duration-500 first:rounded-l-lg" style={{ width: `${prePct}%`, background: "#0f9b8e" }} title={`Pre: ${coInr(kPre)}`} />
            <div className="transition-all duration-500" style={{ width: `${onPct}%`, background: "#1E7E5E" }} title={`On-time: ${coInr(kOn)}`} />
            <div className="transition-all duration-500 last:rounded-r-lg" style={{ width: `${postPct}%`, background: "#e8a33d" }} title={`Post: ${coInr(kPost)}`} />
          </>
        ) : (
          <div className="w-full rounded-lg bg-line" />
        )}
      </div>
    </div>
  );
}
