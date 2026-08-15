"use client";

/**
 * WhatsAppTemplateModal — port of whatsapp_template_modal.php.
 * Templates are fetched LIVE from Dootiq via /api/whatsapp/templates —
 * whenever a new template gets approved on Meta/Dootiq, it appears in the
 * dropdown automatically, with no code changes needed here.
 *
 * Props: { open, onClose, name, mobile, loanId, repaymentAmount, repaymentDate }
 * (same context lpOpenWhatsAppTemplate(name, mobile, loanId, repaymentAmount,
 * repaymentDate) received in the PHP).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
    <path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 003.85 1h.01a7.94 7.94 0 007.9-7.94 7.85 7.85 0 00-2.36-5.62z" />
  </svg>
);

export default function WhatsAppTemplateModal({
  open,
  onClose,
  name = "",
  mobile = "",
  loanId = "",
  repaymentAmount = "",
  repaymentDate = "",
}) {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [templates, setTemplates] = useState(null); // { [key]: {label, language, preview, variables[]} }
  const [selectedKey, setSelectedKey] = useState("");
  const [values, setValues] = useState({}); // variable key → value
  const [sending, setSending] = useState(false);

  /* Map a template variable's "source" key to a value from the current
     lead context — same as lpWaResolveSource() */
  const resolveSource = useCallback(
    (source) => {
      const map = {
        full_name: name,
        repayment_amount: repaymentAmount
          ? "₹" + Number(repaymentAmount).toLocaleString("en-IN")
          : "",
        repayment_date: repaymentDate,
      };
      return map[source] || "";
    },
    [name, repaymentAmount, repaymentDate]
  );

  /* Load templates live from Dootiq each time the modal opens */
  useEffect(() => {
    if (!open) return;
    setSelectedKey("");
    setValues({});
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    clientFetch("/api/whatsapp/templates").then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data?.success) {
        setTemplates(res.data.templates || {});
      } else {
        setTemplates({});
        setLoadError(res.data?.message || res.error || "Could not load templates from Dootiq.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const tpl = selectedKey && templates ? templates[selectedKey] : null;

  const onSelectTemplate = (key) => {
    setSelectedKey(key);
    const next = {};
    const t = templates?.[key];
    if (t) {
      t.variables.forEach((v) => {
        next[v.key] = resolveSource(v.source) || v.example || "";
      });
    }
    setValues(next);
  };

  /* Live preview — supports both named ({{variable_name}}) and positional
     ({{1}}) placeholder styles, same as lpWaUpdatePreview() */
  const preview = useMemo(() => {
    if (!tpl) return "";
    let text = tpl.preview;
    tpl.variables.forEach((v) => {
      const val = values[v.key] || "{{" + v.key + "}}";
      const reNamed = new RegExp("\\{\\{\\s*" + escapeRegExp(v.key) + "\\s*\\}\\}", "g");
      text = text.replace(reNamed, val);
      if (v.position !== null && v.position !== undefined && v.position !== "") {
        const rePos = new RegExp("\\{\\{\\s*" + escapeRegExp(String(v.position)) + "\\s*\\}\\}", "g");
        text = text.replace(rePos, val);
      }
    });
    return text;
  }, [tpl, values]);

  const send = async () => {
    if (!selectedKey) return toast.error("Please select a template");
    if (!mobile) return toast.error("No mobile number on record");

    const variables = {};
    tpl?.variables.forEach((v) => {
      variables[v.key] = values[v.key] ?? "";
    });

    setSending(true);
    const res = await postJson("/api/whatsapp/send", {
      phone: mobile,
      template_name: selectedKey,
      language: tpl?.language || "en",
      variables,
    });
    setSending(false);

    if (res.ok && res.data?.success) {
      toast.success(res.data.message || "Message sent!");
      onClose?.();
    } else {
      toast.error(res.data?.message || "Failed to send message");
    }
  };

  const hasTemplates = templates && Object.keys(templates).length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2 text-[#1b8a4f]">
          {WA_ICON}
          Send WhatsApp Template
          <span className="text-xs font-normal text-gray-400">
            {name}
            {mobile ? "  ·  " + mobile : ""}
          </span>
        </span>
      }
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          {hasTemplates && (
            <button
              className="btn-primary flex items-center gap-1.5 !bg-[#25D366] hover:!bg-[#1fb457] disabled:opacity-60"
              onClick={send}
              disabled={sending}
            >
              {WA_ICON}
              {sending ? "Sending…" : "Send"}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Spinner /> Loading templates…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            Could not load templates: {loadError}
          </div>
        ) : !hasTemplates ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            No approved templates found on your Dootiq account yet.
          </div>
        ) : (
          <>
            <div>
              <label className="label">
                Template <span className="text-danger">*</span>
              </label>
              <select
                className="input w-full cursor-pointer"
                value={selectedKey}
                onChange={(e) => onSelectTemplate(e.target.value)}
              >
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
                      className="input w-full"
                      value={values[v.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {tpl && (
              <div>
                <label className="label">Preview</label>
                <div className="whitespace-pre-wrap rounded-xl border border-[#a8ddc0] bg-[#e9fbf0] px-4 py-3 text-sm leading-relaxed text-[#14532d]">
                  {preview}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
