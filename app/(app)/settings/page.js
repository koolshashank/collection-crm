"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import Spinner, { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import GatewaySection from "@/components/settings/GatewaySection";
import WhatsAppSection from "@/components/settings/WhatsAppSection";
import LoanCorrectionSection from "@/components/settings/LoanCorrectionSection";
import TwoFactorPolicySection from "@/components/settings/TwoFactorPolicySection";
import SmartPrioritizationSection from "@/components/settings/SmartPrioritizationSection";
import LoginAlertSection from "@/components/settings/LoginAlertSection";
import RoundRobinSection from "@/components/settings/RoundRobinSection";
import DocumentHeaderFooterSection from "@/components/settings/DocumentHeaderFooterSection";
import SettlementVintageSection from "@/components/settings/SettlementVintageSection";
import PageSetupSection from "@/components/settings/PageSetupSection";
import NocTemplateSection from "@/components/settings/NocTemplateSection";
import SettlementLetterTemplateSection from "@/components/settings/SettlementLetterTemplateSection";
import NdcTemplateSection from "@/components/settings/NdcTemplateSection";
import EmailConfigSection from "@/components/settings/EmailConfigSection";
import { SETTLEMENT_VINTAGE_DEFAULTS } from "@/lib/settlementVintage";

/* Groups the sections below into tabs so the page doesn't turn into one
   long scroll — purely a layout grouping, the load/save/dirty logic below
   still spans every section regardless of which tab is active. */
const SETTINGS_TABS = [
  { key: "payments", label: "Payments", icon: "card" },
  { key: "communication", label: "Communication", icon: "mail" },
  { key: "email", label: "Email Configure", icon: "mail" },
  { key: "collections", label: "Collections", icon: "users" },
  { key: "security", label: "Security", icon: "shield" },
  { key: "pageSetup", label: "Page Setup", icon: "screen" },
];

const EMAIL_CONFIG_DEFAULT_STATE = {
  host: "smtp.netcorecloud.net",
  port: 587,
  user: "",
  pass: "",
  secure: "tls",
  fromAddress: "",
  fromName: "",
  replyTo: "",
  hasPassword: false,
};

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
  const loginAlertDefaults = { enabled: true, recipients: [], sender: "info@blinkrloan.com" };
  const docHeaderFooterDefaults = { headerUrl: null, headerFormat: null, footerUrl: null, footerFormat: null, footerText: null, updatedAt: null };
  const [original, setOriginal] = useState({ payu: true, paytm: true, wa_active: "vendor_a", require2FA: false, smartPrioritization: false, roundRobin: true, loginAlerts: loginAlertDefaults, docHeaderFooter: docHeaderFooterDefaults, settlementVintage: SETTLEMENT_VINTAGE_DEFAULTS, pageSettings: {}, nocTemplate: null, settlementLetterTemplate: null, ndcTemplate: null, emailConfig: EMAIL_CONFIG_DEFAULT_STATE });
  const [current, setCurrent] = useState({ payu: true, paytm: true, wa_active: "vendor_a", require2FA: false, smartPrioritization: false, roundRobin: true, loginAlerts: loginAlertDefaults, docHeaderFooter: docHeaderFooterDefaults, settlementVintage: SETTLEMENT_VINTAGE_DEFAULTS, pageSettings: {}, nocTemplate: null, settlementLetterTemplate: null, ndcTemplate: null, emailConfig: EMAIL_CONFIG_DEFAULT_STATE });
  const [pageSettingsSchema, setPageSettingsSchema] = useState({});
  const [nocTemplateDefaults, setNocTemplateDefaults] = useState(null);
  const [settlementLetterTemplateDefaults, setSettlementLetterTemplateDefaults] = useState(null);
  const [ndcTemplateDefaults, setNdcTemplateDefaults] = useState(null);
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0].key);
  // Same defaults as settings.php when labels are missing from the config
  const [labels, setLabels] = useState({ vendor_a: "WhatsApp Tech4Logic", vendor_b: "WhatsApp Nimbus" });
  const [saving, setSaving] = useState(false);

  const dirty =
    current.payu !== original.payu ||
    current.paytm !== original.paytm ||
    current.wa_active !== original.wa_active ||
    current.require2FA !== original.require2FA ||
    current.smartPrioritization !== original.smartPrioritization ||
    current.roundRobin !== original.roundRobin ||
    JSON.stringify(current.loginAlerts) !== JSON.stringify(original.loginAlerts) ||
    JSON.stringify(current.docHeaderFooter) !== JSON.stringify(original.docHeaderFooter) ||
    JSON.stringify(current.settlementVintage) !== JSON.stringify(original.settlementVintage) ||
    JSON.stringify(current.pageSettings) !== JSON.stringify(original.pageSettings) ||
    JSON.stringify(current.nocTemplate) !== JSON.stringify(original.nocTemplate) ||
    JSON.stringify(current.settlementLetterTemplate) !== JSON.stringify(original.settlementLetterTemplate) ||
    JSON.stringify(current.ndcTemplate) !== JSON.stringify(original.ndcTemplate) ||
    JSON.stringify(current.emailConfig) !== JSON.stringify(original.emailConfig);

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

    const [gwRes, waRes, tfaRes, spRes, rrRes, laRes, dhfRes, svRes, psRes, ntRes, sltRes, ndcRes, emRes] = await Promise.all([
      clientFetch("/api/config/gateway"),
      clientFetch("/api/config/whatsapp"),
      clientFetch("/api/config/2fa"),
      clientFetch("/api/config/smart-prioritization"),
      clientFetch("/api/config/round-robin"),
      clientFetch("/api/config/login-alerts"),
      clientFetch("/api/config/document-header-footer"),
      clientFetch("/api/config/settlement-vintage"),
      clientFetch("/api/config/page-settings"),
      clientFetch("/api/config/noc-template"),
      clientFetch("/api/config/settlement-letter-template"),
      clientFetch("/api/config/ndc-template"),
      clientFetch("/api/config/email"),
    ]);

    if (
      !gwRes.ok || !waRes.ok || !tfaRes.ok || !spRes.ok || !rrRes.ok || !laRes.ok || !dhfRes.ok || !svRes.ok || !psRes.ok || !ntRes.ok || !sltRes.ok || !ndcRes.ok || !emRes.ok ||
      !gwRes.data?.success || !waRes.data?.success || !tfaRes.data?.success || !spRes.data?.success || !rrRes.data?.success || !laRes.data?.success || !dhfRes.data?.success || !svRes.data?.success || !psRes.data?.success || !ntRes.data?.success || !sltRes.data?.success || !ndcRes.data?.success || !emRes.data?.success
    ) {
      setError(gwRes.data?.message || waRes.data?.message || tfaRes.data?.message || spRes.data?.message || rrRes.data?.message || laRes.data?.message || dhfRes.data?.message || svRes.data?.message || psRes.data?.message || ntRes.data?.message || sltRes.data?.message || ndcRes.data?.message || emRes.data?.message || "Could not load settings.");
      setLoading(false);
      return;
    }

    const gwCfg = gwRes.data.config ?? {};
    const waCfg = waRes.data.config ?? {};
    const tfaCfg = tfaRes.data.config ?? {};
    const spCfg = spRes.data.config ?? {};
    const rrCfg = rrRes.data.config ?? {};
    const laCfg = laRes.data.config ?? {};
    const dhfCfg = dhfRes.data.config ?? {};
    const svCfg = svRes.data.config ?? {};
    setPageSettingsSchema(psRes.data.schema ?? {});
    setNocTemplateDefaults(ntRes.data.defaults ?? null);
    setSettlementLetterTemplateDefaults(sltRes.data.defaults ?? null);
    setNdcTemplateDefaults(ndcRes.data.defaults ?? null);
    const state = {
      payu: Boolean(gwCfg.payu ?? true),
      paytm: Boolean(gwCfg.paytm ?? true),
      wa_active: waCfg.active_vendor ?? "vendor_a",
      require2FA: Boolean(tfaCfg.required ?? false),
      smartPrioritization: Boolean(spCfg.enabled ?? false),
      roundRobin: Boolean(rrCfg.enabled ?? true),
      loginAlerts: {
        enabled: Boolean(laCfg.enabled ?? true),
        recipients: Array.isArray(laCfg.recipients) ? laCfg.recipients : [],
        sender: laCfg.sender ?? "info@blinkrloan.com",
      },
      docHeaderFooter: {
        headerUrl: dhfCfg.headerUrl ?? null,
        headerFormat: dhfCfg.headerFormat ?? null,
        footerUrl: dhfCfg.footerUrl ?? null,
        footerFormat: dhfCfg.footerFormat ?? null,
        footerText: dhfCfg.footerText ?? null,
        updatedAt: dhfCfg.updatedAt ?? null,
      },
      settlementVintage: {
        enabled: Boolean(svCfg.enabled ?? true),
        percents: { ...SETTLEMENT_VINTAGE_DEFAULTS.percents, ...(svCfg.percents ?? {}) },
        updatedAt: svCfg.updatedAt ?? null,
      },
      pageSettings: psRes.data.settings ?? {},
      nocTemplate: ntRes.data.config ?? null,
      settlementLetterTemplate: sltRes.data.config ?? null,
      ndcTemplate: ndcRes.data.config ?? null,
      emailConfig: { ...EMAIL_CONFIG_DEFAULT_STATE, ...(emRes.data.config ?? {}), pass: "" },
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
    const [gwRes, waRes, tfaRes, spRes, rrRes, laRes, dhfRes, svRes, psRes, ntRes, sltRes, ndcRes, emRes] = await Promise.all([
      postJson("/api/config/gateway", { payu: current.payu, paytm: current.paytm }),
      postJson("/api/config/whatsapp", { active_vendor: current.wa_active }),
      postJson("/api/config/2fa", { required: current.require2FA }),
      postJson("/api/config/smart-prioritization", { enabled: current.smartPrioritization }),
      postJson("/api/config/round-robin", { enabled: current.roundRobin }),
      postJson("/api/config/login-alerts", current.loginAlerts),
      postJson("/api/config/document-header-footer", current.docHeaderFooter),
      postJson("/api/config/settlement-vintage", current.settlementVintage),
      postJson("/api/config/page-settings", { settings: current.pageSettings }),
      postJson("/api/config/noc-template", current.nocTemplate),
      postJson("/api/config/settlement-letter-template", current.settlementLetterTemplate),
      postJson("/api/config/ndc-template", current.ndcTemplate),
      postJson("/api/config/email", current.emailConfig),
    ]);
    setSaving(false);

    const gwOk = gwRes.ok && gwRes.data?.success;
    const waOk = waRes.ok && waRes.data?.success;
    const tfaOk = tfaRes.ok && tfaRes.data?.success;
    const spOk = spRes.ok && spRes.data?.success;
    const rrOk = rrRes.ok && rrRes.data?.success;
    const laOk = laRes.ok && laRes.data?.success;
    const dhfOk = dhfRes.ok && dhfRes.data?.success;
    const svOk = svRes.ok && svRes.data?.success;
    const psOk = psRes.ok && psRes.data?.success;
    const ntOk = ntRes.ok && ntRes.data?.success;
    const sltOk = sltRes.ok && sltRes.data?.success;
    const ndcOk = ndcRes.ok && ndcRes.data?.success;
    const emOk = emRes.ok && emRes.data?.success;
    if (gwOk && waOk && tfaOk && spOk && rrOk && laOk && dhfOk && svOk && psOk && ntOk && sltOk && ndcOk && emOk) {
      const savedEmailConfig = emRes.data?.config ? { ...emRes.data.config, pass: "" } : current.emailConfig;
      setOriginal({ ...current, docHeaderFooter: dhfRes.data?.config ?? current.docHeaderFooter, settlementVintage: svRes.data?.config ?? current.settlementVintage, pageSettings: psRes.data?.settings ?? current.pageSettings, nocTemplate: ntRes.data?.config ?? current.nocTemplate, settlementLetterTemplate: sltRes.data?.config ?? current.settlementLetterTemplate, ndcTemplate: ndcRes.data?.config ?? current.ndcTemplate, emailConfig: savedEmailConfig });
      setCurrent((c) => ({ ...c, docHeaderFooter: dhfRes.data?.config ?? c.docHeaderFooter, settlementVintage: svRes.data?.config ?? c.settlementVintage, pageSettings: psRes.data?.settings ?? c.pageSettings, nocTemplate: ntRes.data?.config ?? c.nocTemplate, settlementLetterTemplate: sltRes.data?.config ?? c.settlementLetterTemplate, ndcTemplate: ndcRes.data?.config ?? c.ndcTemplate, emailConfig: savedEmailConfig }));
      success("Settings saved successfully");
    } else {
      toastError(gwRes.data?.message || waRes.data?.message || tfaRes.data?.message || spRes.data?.message || rrRes.data?.message || laRes.data?.message || dhfRes.data?.message || svRes.data?.message || psRes.data?.message || ntRes.data?.message || sltRes.data?.message || ndcRes.data?.message || emRes.data?.message || "Save failed");
    }
  }

  function discard() {
    setCurrent({ ...original });
    info("Changes discarded");
  }

  if (loading || !allowed) return <PageLoader label="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto flex max-w-7xl items-start gap-8 pb-16">
      <SettingsSidebar
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        supportEmail="support@blinkrloan.com"
      />

      <div className="min-w-0 flex-1">
        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3.5">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Admin Only
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-800">System Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage payment gateways and CRM configuration</p>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            <CiIcon name="back" size={13} strokeWidth={2} />
            Back
          </Link>
        </div>

        {/* Tab bar */}
        <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`-mb-px whitespace-nowrap border-b-[2.5px] px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide transition ${
                activeTab === t.key ? "border-accent text-accent-dark" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "payments" && (
        <>
          <GatewaySection
            payu={current.payu}
            paytm={current.paytm}
            onToggle={(key, value) => setCurrent((c) => ({ ...c, [key]: value }))}
          />

          <SettlementVintageSection
            config={current.settlementVintage}
            onChange={(v) => setCurrent((c) => ({ ...c, settlementVintage: v }))}
          />

          <LoanCorrectionSection />
        </>
      )}

      {activeTab === "communication" && (
        <>
          <WhatsAppSection
            activeVendor={current.wa_active}
            labelA={labels.vendor_a}
            labelB={labels.vendor_b}
            onSelectVendor={(vendor) => setCurrent((c) => ({ ...c, wa_active: vendor }))}
          />

          <LoginAlertSection
            config={current.loginAlerts}
            onChange={(v) => setCurrent((c) => ({ ...c, loginAlerts: v }))}
          />

          <DocumentHeaderFooterSection
            config={current.docHeaderFooter}
            onChange={(v) => setCurrent((c) => ({ ...c, docHeaderFooter: v }))}
          />

          {current.nocTemplate && (
            <NocTemplateSection
              config={current.nocTemplate}
              defaults={nocTemplateDefaults}
              onChange={(v) => setCurrent((c) => ({ ...c, nocTemplate: v }))}
            />
          )}

          {current.settlementLetterTemplate && (
            <SettlementLetterTemplateSection
              config={current.settlementLetterTemplate}
              defaults={settlementLetterTemplateDefaults}
              onChange={(v) => setCurrent((c) => ({ ...c, settlementLetterTemplate: v }))}
            />
          )}

          {current.ndcTemplate && (
            <NdcTemplateSection
              config={current.ndcTemplate}
              defaults={ndcTemplateDefaults}
              onChange={(v) => setCurrent((c) => ({ ...c, ndcTemplate: v }))}
            />
          )}
        </>
      )}

      {activeTab === "email" && (
        <EmailConfigSection
          config={current.emailConfig}
          onChange={(v) => setCurrent((c) => ({ ...c, emailConfig: v }))}
        />
      )}

      {activeTab === "collections" && (
        <>
          <SmartPrioritizationSection
            enabled={current.smartPrioritization}
            onToggle={(v) => setCurrent((c) => ({ ...c, smartPrioritization: v }))}
          />

          <RoundRobinSection
            enabled={current.roundRobin}
            onToggle={(v) => setCurrent((c) => ({ ...c, roundRobin: v }))}
          />
        </>
      )}

      {activeTab === "security" && (
        <TwoFactorPolicySection
          required={current.require2FA}
          onToggle={(v) => setCurrent((c) => ({ ...c, require2FA: v }))}
        />
      )}

      {activeTab === "pageSetup" && (
        <PageSetupSection
          schema={pageSettingsSchema}
          settings={current.pageSettings}
          onChange={(pageKey, fieldKey, value) =>
            setCurrent((c) => ({
              ...c,
              pageSettings: {
                ...c.pageSettings,
                [pageKey]: { ...c.pageSettings[pageKey], [fieldKey]: value },
              },
            }))
          }
        />
      )}

        {/* Save bar — always present, Save disabled until something changes */}
        <div className="sticky bottom-4 z-40 mt-5 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-line bg-white px-5 py-3.5 shadow-pop">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CiIcon name="refresh" size={14} strokeWidth={2} className="shrink-0 text-gray-400" />
            {dirty ? "You have unsaved changes — reload the client page after saving to see them." : "Reload the client page after saving to see changes."}
          </div>
          <div className="flex gap-2.5">
            {dirty && (
              <button type="button" onClick={discard} className="btn-secondary">
                Discard
              </button>
            )}
            <button type="button" className="btn-primary" onClick={saveAll} disabled={saving || !dirty}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="border-white border-t-transparent" /> Saving...
                </span>
              ) : (
                <>
                  <CiIcon name="check" size={14} strokeWidth={2.5} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
