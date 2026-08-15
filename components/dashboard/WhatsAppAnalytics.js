"use client";

import { numberFormat } from "./format";
import { Panel, PanelHead, SectionLabel, WidgetError, WidgetLoading, useApi } from "./shared";

/* PHP wa_stat(): first matching key from a list of common-sense guesses */
function waStat(root, keys) {
  for (const k of keys) {
    if (root && root[k] !== undefined) return root[k];
  }
  return null;
}

/**
 * WhatsApp Analytics — mirror of dashboard.php's Dootiq "Project Overview"
 * card (Sessions / Contacts / Campaigns counters).
 */
export default function WhatsAppAnalytics() {
  const { loading, error, data, reload } = useApi("/api/dashboard/whatsapp-analytics");

  const waData = data?.data ?? {};
  const waRoot = waData?.data ?? waData; // some Dootiq endpoints nest under 'data'
  const sessions = waStat(waRoot, ["sessions", "activeSessions", "sessionCount"]);
  const contacts = waStat(waRoot, ["contacts", "totalContacts", "contactCount"]);
  const campaigns = waStat(waRoot, ["campaigns", "totalCampaigns", "campaignCount"]);

  const cells = [
    { value: sessions, label: "Sessions", color: "#25D366" },
    { value: contacts, label: "Contacts", color: "#1a6fa8" },
    { value: campaigns, label: "Campaigns", color: "#9b59b6" },
  ];

  return (
    <>
      <SectionLabel>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
        WhatsApp Analytics
      </SectionLabel>

      <Panel className="mb-4">
        <PanelHead
          title={
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]" style={{ color: "#25D366" }}>
                <path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 003.85 1h.01a7.94 7.94 0 007.9-7.94 7.85 7.85 0 00-2.36-5.62z" />
              </svg>
              Project Overview
            </>
          }
        />

        {loading ? (
          <WidgetLoading label="Loading WhatsApp analytics…" />
        ) : error ? (
          <WidgetError message={error} onRetry={reload} />
        ) : !data?.success ? (
          <div className="px-4 py-8 text-center text-[0.82rem] text-gray-400">
            Could not load WhatsApp analytics.
            <div className="mt-2">
              <button onClick={reload} className="btn-secondary text-xs">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {cells.map((c, i) => (
              <div key={c.label} className={`px-4 py-5 text-center ${i < cells.length - 1 ? "border-b border-line sm:border-b-0 sm:border-r" : ""}`}>
                <div className="font-display text-2xl font-bold" style={{ color: c.color }}>
                  {c.value !== null ? numberFormat(c.value) : "—"}
                </div>
                <div className="mt-1 text-[0.72rem] font-semibold uppercase tracking-wider text-gray-400">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
