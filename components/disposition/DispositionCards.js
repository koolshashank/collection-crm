"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { CiIcon } from "@/components/client-info/icons";
import { toneForCode, iconForLabel } from "./dispositionTones";

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
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-surface" />
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
      {cards.map((card) => {
        const tone = toneForCode(card.code);
        const active = activeCode === card.code;
        return (
          <button
            key={card.code}
            type="button"
            onClick={() => onSelect(card)}
            title={`View all ${card.label} records`}
            className={`rounded-2xl border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              active ? "ring-2 ring-accent ring-offset-1" : ""
            }`}
            style={{ borderColor: tone.border }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: tone.bg, color: tone.text }}
            >
              <CiIcon name={iconForLabel(card.label)} size={16} strokeWidth={2} />
            </span>
            <div className="mt-2.5 truncate text-[12.5px] font-semibold text-gray-700">{card.label}</div>
            <div className="mt-0.5 font-display text-2xl font-bold" style={{ color: tone.text }}>
              {Number(card.count || 0).toLocaleString("en-IN")}
            </div>
            <span
              className="mt-1.5 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide"
              style={{ background: tone.bg, color: tone.text }}
            >
              {card.code}
            </span>
          </button>
        );
      })}
    </div>
  );
}
