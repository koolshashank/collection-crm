"use client";

import ToggleRow from "./ToggleRow";

const WaIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill={color} className="h-5 w-5">
    <path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 003.85 1h.01a7.94 7.94 0 007.9-7.94 7.85 7.85 0 00-2.36-5.62z" />
  </svg>
);

/**
 * WhatsApp Providers card — mirror of settings.php.
 * Exclusive toggles: turning one ON turns the other OFF; turning the active
 * one OFF is a no-op (flips back), exactly like the PHP page's stToggleWA.
 */
export default function WhatsAppSection({ activeVendor, labelA, labelB, onSelectVendor }) {
  function toggle(vendor, on) {
    if (!on) return; // can't turn the active one off — switch via the other row
    onSelectVendor(vendor);
  }

  const activeLabel = activeVendor === "vendor_a" ? labelA : labelB;

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <WaIcon color="#1E7E5E" />
            WhatsApp Providers
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Choose which 3rd-party vendor sends WhatsApp templates</div>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-1 text-xs text-gray-500">{activeLabel} active</div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Only <strong>one</strong> vendor can be active at a time — turning one on automatically turns the other off,
            so templates never get sent twice through two providers.
          </span>
        </div>

        <ToggleRow
          icon={<WaIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name={labelA}
          sub={
            <>
              Template WhatsApp messages · payment reminders, PTP confirmations
              <br />
              <code className="rounded bg-surface px-1 py-0.5 text-[11px] text-gray-600">includes/whatsapp_send.php</code>
            </>
          }
          on={activeVendor === "vendor_a"}
          onChange={(v) => toggle("vendor_a", v)}
        />
        <ToggleRow
          icon={<WaIcon color="#3b6ea5" />}
          iconClass="bg-blue-50 !border-blue-200"
          name={labelB}
          sub={
            <>
              Template WhatsApp messages · payment reminders, PTP confirmations
              <br />
              <code className="rounded bg-surface px-1 py-0.5 text-[11px] text-gray-600">includes/whatsapp_send.php</code>
            </>
          }
          on={activeVendor === "vendor_b"}
          onChange={(v) => toggle("vendor_b", v)}
        />
      </div>
    </div>
  );
}
