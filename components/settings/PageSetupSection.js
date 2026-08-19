"use client";

import { useState } from "react";
import ToggleRow from "./ToggleRow";

const GearIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

/**
 * Page Setup — generic, schema-driven per-page display settings. `schema`
 * comes straight from GET /api/config/page-settings (lib/pageSettings.js's
 * PAGE_SETTINGS_SCHEMA registry): to add settings for another page later,
 * register it there — this section picks it up automatically, no UI
 * changes needed here.
 */
export default function PageSetupSection({ schema, settings, onChange }) {
  const pageKeys = Object.keys(schema || {});
  const [activePage, setActivePage] = useState(pageKeys[0] || "");
  const currentKey = schema?.[activePage] ? activePage : pageKeys[0];

  if (pageKeys.length === 0) return null;
  const page = schema[currentKey];
  const pageValues = settings?.[currentKey] || {};

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <GearIcon color="currentColor" />
            </span>
            Page Setup
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            Control what shows up — and what gets masked — on individual pages
          </div>
        </div>
      </div>
      <div className="p-5">
        {pageKeys.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {pageKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActivePage(key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  currentKey === key
                    ? "border-accent bg-accent-light text-accent-dark"
                    : "border-line text-gray-500 hover:border-gray-300"
                }`}
              >
                {schema[key].label}
              </button>
            ))}
          </div>
        )}

        {page?.fields?.length ? (
          page.fields.map((f) => (
            <ToggleRow
              key={f.key}
              icon={<GearIcon color="#1E7E5E" />}
              iconClass="bg-emerald-50 !border-emerald-200"
              name={f.label}
              sub={f.sub}
              on={Boolean(pageValues[f.key] ?? f.default)}
              onChange={(v) => onChange(currentKey, f.key, v)}
            />
          ))
        ) : (
          <p className="text-sm text-gray-400">No configurable options for this page yet.</p>
        )}
      </div>
    </div>
  );
}
