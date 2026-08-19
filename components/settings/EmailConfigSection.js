"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";

function Field({ label, value, onChange, type = "text", placeholder, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/**
 * Email Configure — the one SMTP account NOC, Settlement Letter and NDC
 * emails all send through (lib/emailConfig.js). Used to be hardcoded
 * Netcore credentials baked into lib/mail.js and app/api/noc/email/route.js
 * — now a password rotation is a Settings edit, not a code change.
 */
export default function EmailConfigSection({ config, onChange }) {
  const toast = useToast();
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  function setField(key, value) {
    onChange({ ...config, [key]: value });
  }

  async function sendTest() {
    if (!testTo.trim()) {
      toast.error("Enter an email address to send the test to.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/config/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo, draft: config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || "Test email failed.");
        return;
      }
      toast.success(data.message || "Test email sent.");
    } catch {
      toast.error("Network error — could not send the test email.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-dark">
            <CiIcon name="mail" size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="font-display text-sm font-bold text-gray-800">Email Configure</div>
            <div className="mt-0.5 text-xs text-gray-500">
              The SMTP account NOC, Settlement Letter and NDC emails send through
            </div>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            config.hasPassword ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-danger"
          }`}
        >
          {config.hasPassword ? "Password set" : "No password set"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          Changing the password here takes effect on the very next email sent — no redeploy needed. Leave the
          password field blank to keep the current one.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="SMTP Host" value={config.host} onChange={(v) => setField("host", v)} />
          <Field label="SMTP Port" type="number" value={config.port} onChange={(v) => setField("port", v)} />
          <Field label="SMTP Username" value={config.user} onChange={(v) => setField("user", v)} />
          <Field
            label="SMTP Password"
            type="password"
            value={config.pass || ""}
            onChange={(v) => setField("pass", v)}
            placeholder={config.hasPassword ? "•••••••• (unchanged)" : "Enter a password"}
            hint="Leave blank to keep the existing password"
          />
          <div>
            <label className="label">Encryption</label>
            <select className="input" value={config.secure} onChange={(e) => setField("secure", e.target.value)}>
              <option value="tls">STARTTLS (tls) — port 587</option>
              <option value="ssl">SSL — port 465</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="From Address" value={config.fromAddress} onChange={(v) => setField("fromAddress", v)} />
          <Field label="From Name" value={config.fromName} onChange={(v) => setField("fromName", v)} />
          <Field label="Reply-To Address" value={config.replyTo} onChange={(v) => setField("replyTo", v)} />
        </div>

        <div className="rounded-xl border border-line bg-surface p-3.5">
          <label className="label">Send a test email</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              className="input flex-1"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={sendTest} disabled={testing}>
              {testing ? (
                <>
                  <Spinner size={12} /> Sending…
                </>
              ) : (
                <>
                  <CiIcon name="check" size={13} strokeWidth={2} />
                  Send Test
                </>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Uses whatever is in the fields above, even if you haven't clicked Save Changes yet.
          </p>
        </div>
      </div>
    </div>
  );
}
