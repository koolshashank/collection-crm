"use client";

import ToggleRow from "./ToggleRow";

const CardIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

/**
 * Payment Gateways card — mirror of settings.php. Same wording, same
 * "N active" status chip, same PayU / Paytm rows.
 */
export default function GatewaySection({ payu, paytm, onToggle }) {
  const activeCount = (payu ? 1 : 0) + (paytm ? 1 : 0);
  const statusText = activeCount === 2 ? "2 active" : activeCount === 1 ? "1 active" : "0 active - WARNING";

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <CardIcon color="currentColor" />
            </span>
            Payment Gateways
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Control which gateways appear in the payment link modal</div>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-1 text-xs text-gray-500">{statusText}</div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Disabling a gateway hides it from the <strong>Generate Payment Link</strong> modal on all client pages. Reload
            the client page after saving to see the effect.
          </span>
        </div>

        <ToggleRow
          icon={<CardIcon color="#3c64aa" />}
          iconClass="bg-blue-50 !border-blue-200"
          name="PayU"
          sub={
            <>
              UPI · Debit/Credit Cards · Net Banking · Wallets
              <br />
              <code className="rounded bg-surface px-1 py-0.5 text-[11px] text-gray-600">
                generate_payment_link_payu.php
              </code>
            </>
          }
          on={payu}
          onChange={(v) => onToggle("payu", v)}
        />
        <ToggleRow
          icon={<CardIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Paytm"
          sub={
            <>
              UPI · Paytm Wallet · Cards
              <br />
              <code className="rounded bg-surface px-1 py-0.5 text-[11px] text-gray-600">
                generate_payment_link_paytm.php
              </code>
            </>
          }
          on={paytm}
          onChange={(v) => onToggle("paytm", v)}
        />
      </div>
    </div>
  );
}
