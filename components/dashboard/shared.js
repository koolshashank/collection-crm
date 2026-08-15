"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import Spinner from "@/components/ui/Spinner";

/** Small data-source hook: never throws, exposes reload for per-widget retry. */
export function useApi(url) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await clientFetch(url);
    if (res.ok) {
      setState({ loading: false, error: null, data: res.data });
    } else {
      setState({ loading: false, error: res.error || "Request failed", data: null });
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

/** Section label with trailing rule — mirror of .db-slab */
export function SectionLabel({ children, right }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-[0.67rem] font-bold uppercase tracking-[0.09em] text-gray-400">
        {children}
      </span>
      <span className="hidden h-px flex-1 bg-line sm:block" />
      {right}
    </div>
  );
}

/** Panel shell — mirror of .db-panel / .db-panel-head */
export function Panel({ children, className = "" }) {
  return <div className={`card overflow-hidden ${className}`}>{children}</div>;
}

export function PanelHead({ title, link, right }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
      <h3 className="flex items-center gap-2 font-display text-[0.93rem] text-gray-800">{title}</h3>
      {link}
      {right}
    </div>
  );
}

/** Compact per-widget loading block */
export function WidgetLoading({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
      <Spinner size={20} />
      {label}
    </div>
  );
}

/** Compact per-widget error block with retry */
export function WidgetError({ message = "Could not load this section.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs">
          Try again
        </button>
      )}
    </div>
  );
}

/** Stats strip under panels — mirror of .db-stats-strip */
export function StatsStrip({ items }) {
  return (
    <div className="flex flex-wrap border-t border-line bg-surface">
      {items.map((it, i) => (
        <div
          key={i}
          className="min-w-[25%] flex-1 border-r border-line px-3 py-2.5 text-center last:border-r-0"
        >
          <div className="font-display text-[1.05rem] font-bold text-gray-800" style={it.color ? { color: it.color } : undefined}>
            {it.value}
          </div>
          <div className="mt-0.5 text-[0.64rem] text-gray-400">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
