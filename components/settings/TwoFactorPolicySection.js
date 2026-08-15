"use client";

import ToggleRow from "./ToggleRow";

const ShieldIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
  </svg>
);

/**
 * Two-Factor Authentication card — a single global switch. When on, every
 * user must pass a Google Authenticator code to log in; anyone who hasn't
 * enrolled yet is walked through QR setup on their next login. When off,
 * login is password-only for everyone, regardless of prior enrollment.
 */
export default function TwoFactorPolicySection({ required, onToggle }) {
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <ShieldIcon color="currentColor" />
            </span>
            Two-Factor Authentication
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Require a Google Authenticator code for every login</div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Turning this <strong>on</strong> applies to everyone. Anyone who hasn&apos;t set up their authenticator yet
            will be asked to scan a QR code the next time they log in. Turning it <strong>off</strong> lets everyone log
            in with just their email and password again.
          </span>
        </div>

        <ToggleRow
          icon={<ShieldIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Require Two-Factor Authentication"
          sub="Applies to all users at their next login"
          on={required}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}
