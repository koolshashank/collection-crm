"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

/* Light tones cycled across the cards so codes are easy to tell apart. */
const TONES = [
  { bg: "#eef6fd", border: "#bcd8f5", text: "#2563a8" },
  { bg: "#ecfbf7", border: "#a8e0d8", text: "#0f766e" },
  { bg: "#fdf6e9", border: "#f0d9a8", text: "#8a5a12" },
  { bg: "#f6f1fd", border: "#ddd0f7", text: "#6d28d9" },
  { bg: "#fdf1f5", border: "#f6c9d6", text: "#b83280" },
  { bg: "#fdf2f2", border: "#f3c6c6", text: "#c0392b" },
];

export default function DispositionCards({ onSelect, activeCode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await clientFetch("/api/disposition/history?mode=summary");
      if (cancelled) return;
      if (!res.ok || !res.data?.success) {
        setError(
          res.data?.message ||
            res.error ||
            `Could not load disposition summary (HTTP ${res.status || "no response"}).`
        );
        setCards([]);
      } else {
        setCards(res.data.cards ?? []);
        setNote(res.data.note ?? null);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="card mb-4 p-3 text-xs text-danger">{error}</div>;
  }

  if (note) {
    return <div className="card mb-4 p-3 text-xs text-amber">{note}</div>;
  }

  if (cards.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, i) => {
        const tone = TONES[i % TONES.length];
        const active = activeCode === card.code;
        return (
          <button
            key={card.code}
            type="button"
            onClick={() => onSelect(card)}
            title={`View all ${card.label} records`}
            className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              active ? "ring-2 ring-accent ring-offset-1" : ""
            }`}
            style={{ background: tone.bg, borderColor: tone.border }}
          >
            <div className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-500">
              {card.label}
            </div>
            <div className="mt-0.5 font-display text-xl font-bold" style={{ color: tone.text }}>
              {Number(card.count || 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-gray-400">{card.code}</div>
          </button>
        );
      })}
    </div>
  );
}