"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import Spinner, { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import GatewaySection from "@/components/settings/GatewaySection";
import WhatsAppSection from "@/components/settings/WhatsAppSection";
import LoanCorrectionSection from "@/components/settings/LoanCorrectionSection";
import TwoFactorPolicySection from "@/components/settings/TwoFactorPolicySection";
import SmartPrioritizationSection from "@/components/settings/SmartPrioritizationSection";

/**
 * System Settings — port of settings.php.
 * Admin only (ADMIN / COLLECTION-HEAD / RECOVERY_HEAD) — others are
 * redirected to /dashboard, same as the PHP page.
 * Saves POST /api/config/gateway { payu, paytm } and
 * POST /api/config/whatsapp { active_vendor } — identical payloads.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [original, setOriginal] = useState({ payu: true, paytm: true, wa_active: "vendor_a", require2FA: false, smartPrioritization: false });
  const [current, setCurrent] = useState({ payu: true, paytm: true, wa_active: "vendor_a", require2FA: false, smartPrioritization: false });
  // Same defaults as settings.php when labels are missing from the config
  const [labels, setLabels] = useState({ vendor_a: "WhatsApp Tech4Logic", vendor_b: "WhatsApp Nimbus" });
  const [saving, setSaving] = useState(false);

  const dirty =
    current.payu !== original.payu ||
    current.paytm !== original.paytm ||
    current.wa_active !== original.wa_active ||
    current.require2FA !== original.require2FA ||
    current.smartPrioritization !== original.smartPrioritization;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    const isAdmin = roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const [gwRes, waRes, tfaRes, spRes] = await Promise.all([
      clientFetch("/api/config/gateway"),
      clientFetch("/api/config/whatsapp"),
      clientFetch("/api/config/2fa"),
      clientFetch("/api/config/smart-prioritization"),
    ]);

    if (
      !gwRes.ok || !waRes.ok || !tfaRes.ok || !spRes.ok ||
      !gwRes.data?.success || !waRes.data?.success || !tfaRes.data?.success || !spRes.data?.success
    ) {
      setError(gwRes.data?.message || waRes.data?.message || tfaRes.data?.message || spRes.data?.message || "Could not load settings.");
      setLoading(false);
      return;
    }

    const gwCfg = gwRes.data.config ?? {};
    const waCfg = waRes.data.config ?? {};
    const tfaCfg = tfaRes.data.config ?? {};
    const spCfg = spRes.data.config ?? {};
    const state = {
      payu: Boolean(gwCfg.payu ?? true),
      paytm: Boolean(gwCfg.paytm ?? true),
      wa_active: waCfg.active_vendor ?? "vendor_a",
      require2FA: Boolean(tfaCfg.required ?? false),
      smartPrioritization: Boolean(spCfg.enabled ?? false),
    };
    setOriginal(state);
    setCurrent(state);
    setLabels({
      vendor_a: waCfg?.vendors?.vendor_a?.label ?? "WhatsApp Tech4Logic",
      vendor_b: waCfg?.vendors?.vendor_b?.label ?? "WhatsApp Nimbus",
    });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Warn on leaving with unsaved changes (parity with the PHP page)
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function saveAll() {
    setSaving(true);
    const [gwRes, waRes, tfaRes, spRes] = await Promise.all([
      postJson("/api/config/gateway", { payu: current.payu, paytm: current.paytm }),
      postJson("/api/config/whatsapp", { active_vendor: current.wa_active }),
      postJson("/api/config/2fa", { required: current.require2FA }),
      postJson("/api/config/smart-prioritization", { enabled: current.smartPrioritization }),
    ]);
    setSaving(false);

    const gwOk = gwRes.ok && gwRes.data?.success;
    const waOk = waRes.ok && waRes.data?.success;
    const tfaOk = tfaRes.ok && tfaRes.data?.success;
    const spOk = spRes.ok && spRes.data?.success;
    if (gwOk && waOk && tfaOk && spOk) {
      setOriginal({ ...current });
      success("Settings saved successfully");
    } else {
      toastError(gwRes.data?.message || waRes.data?.message || tfaRes.data?.message || spRes.data?.message || "Save failed");
    }
  }

  function discard() {
    setCurrent({ ...original });
    info("Changes discarded");
  }

  if (loading || !allowed) return <PageLoader label="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Page header */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage payment gateways and CRM configuration</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      <GatewaySection
        payu={current.payu}
        paytm={current.paytm}
        onToggle={(key, value) => setCurrent((c) => ({ ...c, [key]: value }))}
      />

      <WhatsAppSection
        activeVendor={current.wa_active}
        labelA={labels.vendor_a}
        labelB={labels.vendor_b}
        onSelectVendor={(vendor) => setCurrent((c) => ({ ...c, wa_active: vendor }))}
      />

      <LoanCorrectionSection />

      <TwoFactorPolicySection
        required={current.require2FA}
        onToggle={(v) => setCurrent((c) => ({ ...c, require2FA: v }))}
      />

      <SmartPrioritizationSection
        enabled={current.smartPrioritization}
        onToggle={(v) => setCurrent((c) => ({ ...c, smartPrioritization: v }))}
      />

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 z-40 mt-5 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-navy px-5 py-3.5 text-white shadow-pop">
          <div className="flex items-center gap-2 text-sm font-medium">⚠ You have unsaved gateway changes</div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={discard}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Discard
            </button>
            <button type="button" className="btn-primary" onClick={saveAll} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="border-white border-t-transparent" /> Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
