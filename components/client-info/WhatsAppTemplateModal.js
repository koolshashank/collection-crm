"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { CiIcon, WhatsAppIcon } from "./icons";
import { InlineSpinner } from "./SectionCard";
import { ciDate } from "./helpers";

/**
 * Send WhatsApp Template modal — port of whatsapp_template_modal.php.
 * Templates were fetched server-side from Dootiq (GET /templates) in PHP;
 * here they load from /api/whatsapp/templates (owned by the WhatsApp
 * module). Failures show the same "Could not load templates: …" banner.
 * Send posts to /api/whatsapp/send (send_whatsapp_action.php) with the
 * identical body { phone, template_name, language, variables }.
 */

/* dootiq_guess_variable_source equivalent — map variable name → lead field */
function guessSource(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("name")) return "full_name";
  if (n.includes("amount")) return "repayment_amount";
  if (n.includes("date")) return "repayment_date";
  return "";
}

function normalizeTemplates(raw) {
  /* Accepts either the pre-shaped map or the raw Dootiq template list */
  if (raw && !Array.isArray(raw) && typeof raw === "object" && !raw.templates) return raw;
  const list = Array.isArray(raw) ? raw : raw?.templates || [];
  const map = {};
  list.forEach((t) => {
    const vars = [...(t.body?.variables || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    map[t.name] = {
      label: t.displayName || t.name,
      language: t.language || "en",
      preview: t.body?.text || "",
      variables: vars.map((v) => ({
        key: v.name || "var" + (v.position ?? ""),
        label: String(v.name || "Value")
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        source: v.source || guessSource(v.name),
        example: v.example || "",
        position: v.position ?? null,
      })),
    };
  });
  return map;
}

export default function WhatsAppTemplateModal({ open, onClose, ctx }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [templates, setTemplates] = useState({});
  const [selected, setSelected] = useState("");
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);

  /* Current lead context for auto-filling variables */
  function resolveSource(source) {
    const map = {
      full_name: ctx.name,
      repayment_amount: ctx.repaymentAmount
        ? "₹" + Number(ctx.repaymentAmount).toLocaleString("en-IN")
        : "",
      repayment_date: ctx.repaymentDate,
    };
    return map[source] || "";
  }

  useEffect(() => {
    if (!open) return;
    setSelected("");
    setValues({});
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const res = await clientFetch("/api/whatsapp/templates?status=APPROVED&limit=100");
      if (cancelled) return;
      setLoading(false);
      if (res.status === 0 || !res.ok || res.data?.success === false) {
        setLoadError(res.data?.message || res.error || "Could not reach template service");
        setTemplates({});
        return;
      }
      const raw = res.data?.templates ?? res.data?.data ?? res.data;
      setTemplates(normalizeTemplates(raw));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const tpl = templates[selected];

  function selectTemplate(key) {
    setSelected(key);
    const t = templates[key];
    if (!t) {
      setValues({});
      return;
    }
    const v = {};
    t.variables.forEach((x) => {
      v[x.key] = resolveSource(x.source) || x.example || "";
    });
    setValues(v);
  }

  /* Preview — supports named ({{var}}) and positional ({{1}}) placeholders */
  const preview = useMemo(() => {
    if (!tpl) return "";
    let text = tpl.preview;
    tpl.variables.forEach((v) => {
      const val = values[v.key] || `{{${v.key}}}`;
      text = text.replace(new RegExp("\\{\\{\\s*" + v.key + "\\s*\\}\\}", "g"), val);
      if (v.position) {
        text = text.replace(new RegExp("\\{\\{\\s*" + v.position + "\\s*\\}\\}", "g"), val);
      }
    });
    return text;
  }, [tpl, values]);

  async function send() {
    if (!selected) return toast.error("Please select a template");
    if (!ctx.mobile) return toast.error("No mobile number on record");
    setSending(true);
    const res = await postJson("/api/whatsapp/send", {
      phone: ctx.mobile,
      template_name: selected,
      language: tpl?.language || "en",
      variables: values,
    });
    setSending(false);
    if (res.status === 0) return toast.error("Network error — please try again");
    if (res.data?.success) {
      toast.success(res.data.message || "Message sent!");
      onClose();
    } else {
      toast.error(res.data?.message || "Failed to send message");
    }
  }

  if (!open) return null;

  const hasTemplates = Object.keys(templates).length > 0;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-[rgba(44,35,24,.45)] p-5 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[520px] rounded-2xl border border-line bg-panel shadow-pop">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-line bg-gradient-to-br from-[#1b8a4f] to-[#25D366] px-5 py-4">
          <div>
            <div className="flex items-center gap-2 font-display text-base text-white">
              <WhatsAppIcon size={15} />
              Send WhatsApp Template
            </div>
            <div className="mt-0.5 text-xs text-white/85">
              {ctx.name}
              {ctx.mobile ? `  ·  ${ctx.mobile}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white"
            aria-label="Close"
          >
            <CiIcon name="x" size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex max-h-[65vh] flex-col gap-3.5 overflow-y-auto px-5 py-5">
          {loading ? (
            <InlineSpinner text="Loading templates…" />
          ) : loadError ? (
            <div className="rounded-lg border border-[#f5c6c6] bg-[#fdf2f2] px-3.5 py-3 text-sm text-danger">
              Could not load templates: {loadError}
            </div>
          ) : !hasTemplates ? (
            <div className="rounded-lg border border-[#f5c6c6] bg-[#fdf2f2] px-3.5 py-3 text-sm text-danger">
              No approved templates found on your Dootiq account yet.
            </div>
          ) : (
            <>
              <div>
                <label className="label">
                  Template <span className="text-danger">*</span>
                </label>
                <select className="input" value={selected} onChange={(e) => selectTemplate(e.target.value)}>
                  <option value="">— Select a template —</option>
                  {Object.entries(templates).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {tpl && (
                <div className="flex flex-col gap-2.5">
                  {tpl.variables.map((v) => (
                    <div key={v.key}>
                      <label className="label">{v.label}</label>
                      <input
                        type="text"
                        className="input"
                        value={values[v.key] ?? ""}
                        onChange={(e) => setValues((vals) => ({ ...vals, [v.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {tpl && (
                <div>
                  <label className="label">Preview</label>
                  <div className="whitespace-pre-wrap rounded-xl border border-[#a8ddc0] bg-[#e9fbf0] px-3.5 py-3 text-sm leading-relaxed text-[#14532d]">
                    {preview}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-surface px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {hasTemplates && !loadError && (
            <button
              className="btn bg-[#25D366] text-white hover:bg-[#1fb457]"
              onClick={send}
              disabled={sending}
            >
              <WhatsAppIcon size={13} />
              {sending ? "Sending…" : "Send"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
