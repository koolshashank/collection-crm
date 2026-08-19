"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";

const CardIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

/* Real data only — same methods/file strings the old plain-text version
   used, just structured so they can render as chips instead of one line. */
const GATEWAYS = [
  {
    key: "payu",
    name: "PayU",
    logoClass: "bg-[#f3e8fd] text-[#6d28d9]",
    methods: ["UPI", "Debit/Credit Cards", "Net Banking", "Wallets"],
    file: "generate_payment_link_payu.php",
  },
  {
    key: "paytm",
    name: "Paytm",
    logoClass: "bg-[#eaf2fb] text-[#2563a8]",
    methods: ["UPI", "Paytm Wallet", "Cards"],
    file: "generate_payment_link_paytm.php",
  },
];

const VISIBLE_METHODS = 3;

function MiniToggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 rounded-full transition-colors ${on ? "bg-emerald-700" : "bg-line"}`}
    >
      <span
        className={`absolute bottom-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}

function GatewayRow({ gw, on, onToggle }) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = gw.methods.slice(0, VISIBLE_METHODS);
  const overflow = gw.methods.length - visible.length;

  function copyFile() {
    navigator.clipboard?.writeText(gw.file).then(
      () => toast.success(`Copied ${gw.file}`),
      () => toast.error("Could not copy — copy it manually")
    );
    setMenuOpen(false);
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-3.5 pr-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-lg text-[13px] font-black italic ${gw.logoClass}`}>
            {gw.name}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-800">{gw.name}</span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-surface text-gray-400"
                }`}
              >
                {on ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3.5 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {visible.map((m) => (
            <span key={m} className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-gray-600">
              {m}
            </span>
          ))}
          {overflow > 0 && (
            <span
              className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-gray-400"
              title={gw.methods.slice(VISIBLE_METHODS).join(", ")}
            >
              +{overflow}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 pr-3">
        <button
          type="button"
          onClick={copyFile}
          title="Copy file name"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 font-mono text-[11px] text-gray-600 transition hover:bg-accent-light hover:text-accent-dark"
        >
          {gw.file}
          <CiIcon name="copy" size={11} strokeWidth={2} />
        </button>
      </td>
      <td className="py-3.5 pr-3">
        <div className="flex items-center gap-2">
          <MiniToggle on={on} onChange={onToggle} />
          <span className={`text-xs font-semibold ${on ? "text-emerald-700" : "text-gray-400"}`}>{on ? "On" : "Off"}</span>
        </div>
      </td>
      <td className="relative py-3.5 text-right">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-surface hover:text-gray-700"
          aria-label="Row actions"
        >
          <CiIcon name="dots" size={14} strokeWidth={2} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-10 w-52 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={copyFile}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-gray-700 hover:bg-surface"
            >
              <CiIcon name="copy" size={13} strokeWidth={2} className="text-gray-400" />
              Copy integration file path
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Payment Gateways card — same PayU / Paytm on/off switches as before, now
 * laid out as a table (gateway · supported methods · integration file ·
 * status · actions) so it reads like the rest of the settings redesign.
 */
export default function GatewaySection({ payu, paytm, onToggle }) {
  const toast = useToast();
  const values = { payu, paytm };
  const activeCount = (payu ? 1 : 0) + (paytm ? 1 : 0);

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-dark">
            <CardIcon color="currentColor" />
          </span>
          <div>
            <div className="font-display text-sm font-bold text-gray-800">Payment Gateways</div>
            <div className="mt-0.5 text-xs text-gray-500">Control which gateways appear in the payment link modal</div>
          </div>
        </div>
        <span className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-gray-500">
          {activeCount} active
        </span>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Disabling a gateway hides it from the <strong>Generate Payment Link</strong> modal on all client pages.
            Reload the client page after saving to see the effect.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-2.5 pr-3 font-bold">Gateway</th>
                <th className="pb-2.5 pr-3 font-bold">Supported Methods</th>
                <th className="pb-2.5 pr-3 font-bold">Integration File</th>
                <th className="pb-2.5 pr-3 font-bold">Status</th>
                <th className="pb-2.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {GATEWAYS.map((gw) => (
                <GatewayRow key={gw.key} gw={gw} on={values[gw.key]} onToggle={(v) => onToggle(gw.key, v)} />
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => toast.error("Custom gateways aren't supported yet — contact engineering to add a new one.")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-accent/50 px-4 py-2 text-sm font-semibold text-accent-dark transition hover:bg-accent-light"
        >
          <CiIcon name="plus" size={14} strokeWidth={2.5} />
          Add New Gateway
        </button>
      </div>
    </div>
  );
}
