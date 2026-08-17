"use client";

import { useState } from "react";
import ToggleRow from "./ToggleRow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const BellIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

/**
 * Failed Login Alerts card — admin-managed list of email addresses that get
 * notified whenever someone fails to log in (wrong password, wrong 2FA
 * code, or a role that isn't allowed to access the CRM).
 */
export default function LoginAlertSection({ config, onChange }) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const recipients = config?.recipients ?? [];

  function addRecipient() {
    const email = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setDraftError("Enter a valid email address");
      return;
    }
    if (recipients.includes(email)) {
      setDraftError("Already in the list");
      return;
    }
    onChange({ ...config, recipients: [...recipients, email] });
    setDraft("");
    setDraftError("");
  }

  function removeRecipient(email) {
    onChange({ ...config, recipients: recipients.filter((r) => r !== email) });
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
            <span className="text-accent">
              <BellIcon color="currentColor" />
            </span>
            Failed Login Alerts
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Email these people whenever a login attempt fails</div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <span>
            Sent for wrong passwords, wrong 2FA codes, or an account role that isn&apos;t allowed to log in. Each alert
            includes the attempted account, IP address, device and time — the full history is also kept in the Audit Log.
          </span>
        </div>

        <ToggleRow
          icon={<BellIcon color="#1E7E5E" />}
          iconClass="bg-emerald-50 !border-emerald-200"
          name="Email alerts on failed logins"
          sub="Turn off to stop sending emails without losing the recipient list"
          on={Boolean(config?.enabled)}
          onChange={(v) => onChange({ ...config, enabled: v })}
        />

        <div className="mt-4">
          <label className="label">Sender email (From address)</label>
          <input
            type="email"
            className="input"
            placeholder="info@blinkrloan.com"
            value={config?.sender ?? ""}
            onChange={(e) => onChange({ ...config, sender: e.target.value })}
          />
          <div className="mt-1.5 text-xs text-gray-400">The address alert emails are sent from.</div>
        </div>

        <div className="mt-4">
          <label className="label">Notify these email addresses</label>
          <div className="flex gap-2">
            <input
              type="email"
              className="input"
              placeholder="admin@company.com"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
            />
            <button type="button" className="btn-secondary shrink-0" onClick={addRecipient}>
              Add
            </button>
          </div>
          {draftError && <div className="mt-1.5 text-xs font-medium text-danger">{draftError}</div>}

          {recipients.length === 0 ? (
            <div className="mt-3 text-xs text-gray-400">No recipients yet — add at least one email to enable alerts.</div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="text-gray-400 hover:text-danger"
                    aria-label={`Remove ${email}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
