"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import Icon from "@/components/nav/Icon";

/**
 * Company Setup — app name, tagline, logo, and the two base theme colors
 * (accent/navy — accent-dark/accent-light/navy-light are derived server-side
 * in lib/companyConfig.js). Saving posts to /api/config/company then calls
 * router.refresh() so the root layout re-reads the config and the new
 * theme applies immediately, app-wide, without a full page reload.
 */
export default function CompanySetupPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allowed, setAllowed] = useState(false);

  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    if (!roles.includes("ADMIN")) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const res = await clientFetch("/api/config/company");
    if (!res.ok || !res.data?.success) {
      setError(res.data?.message || res.error || "Could not load company setup.");
      setLoading(false);
      return;
    }
    setForm({ appName: res.data.config.appName, tagline: res.data.config.tagline, logoUrl: res.data.config.logoUrl, accent: res.data.config.accent, navy: res.data.config.navy });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await clientFetch("/api/config/company/logo", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok && res.data?.success) {
      setForm((f) => ({ ...f, logoUrl: res.data.url }));
      success("Logo uploaded — hit Save to apply it.");
    } else {
      toastError(res.data?.message || "Logo upload failed.");
    }
    e.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    const res = await postJson("/api/config/company", form);
    setSaving(false);
    if (res.ok && res.data?.success) {
      success(res.data.message || "Company setup saved.");
      router.refresh();
    } else {
      toastError(res.data?.message || "Save failed.");
    }
  }

  async function handleReset() {
    setResetting(true);
    const res = await clientFetch("/api/config/company", { method: "DELETE" });
    setResetting(false);
    if (res.ok && res.data?.success) {
      setForm({
        appName: res.data.config.appName,
        tagline: res.data.config.tagline,
        logoUrl: res.data.config.logoUrl,
        accent: res.data.config.accent,
        navy: res.data.config.navy,
      });
      success(res.data.message || "Reset to default.");
      router.refresh();
    } else {
      toastError(res.data?.message || "Reset failed.");
    }
  }

  if (loading || !allowed || !form) return <PageLoader label="Loading company setup…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Company Setup</h1>
          <p className="mt-1 text-sm text-gray-500">App name, logo, and theme color — changes apply to the whole app.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      <div className="card mb-5 overflow-hidden">
        <div className="border-b border-line px-5 py-4 font-display text-base text-gray-800">Branding</div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">App Name</label>
            <input
              className="input"
              value={form.appName}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input
              className="input"
              value={form.tagline}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="shield-check" size={22} className="text-gray-300" />
                )}
              </span>
              <label className="btn-secondary cursor-pointer">
                {uploading ? "Uploading…" : "Upload Logo"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} disabled={uploading} />
              </label>
              {form.logoUrl && (
                <button type="button" className="text-xs font-semibold text-danger hover:underline" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}>
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">PNG, JPEG, WEBP, or SVG — up to 2MB.</p>
          </div>
        </div>
      </div>

      <div className="card mb-5 overflow-hidden">
        <div className="border-b border-line px-5 py-4 font-display text-base text-gray-800">Theme Color</div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Primary / Accent Color</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-line"
                value={form.accent}
                onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))}
              />
              <span className="font-mono text-sm text-gray-600">{form.accent}</span>
            </div>
          </div>
          <div>
            <label className="label">Secondary / Navy Color</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-line"
                value={form.navy}
                onChange={(e) => setForm((f) => ({ ...f, navy: e.target.value }))}
              />
              <span className="font-mono text-sm text-gray-600">{form.navy}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-surface px-5 py-4">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: form.accent }}
            >
              Primary Button
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${form.accent}1a`, color: form.accent }}
            >
              Badge
            </span>
            <span
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${form.navy}, ${form.navy})` }}
            >
              Header / Sidebar
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy px-5 py-3.5 text-white shadow-pop">
        <button type="button" onClick={handleReset} disabled={resetting || saving} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
          {resetting ? "Resetting…" : "Reset to Default"}
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || resetting}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
