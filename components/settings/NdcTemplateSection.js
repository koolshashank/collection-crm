"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";

const PLACEHOLDER_HINTS = [
  ["{loanNo}", "Loan Account No."],
  ["{borrowerName}", "Borrower name"],
  ["{pan}", "PAN"],
  ["{ndcDateDisp}", "NDC date"],
  ["{settleDateDisp}", "Settlement date"],
  ["{settleAmtDisp}", "Settlement amount received"],
  ["{waiverAmtDisp}", "Waiver amount"],
  ["{remarks}", "Optional remarks"],
];

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="text" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * NDC Template — the No Dues Certificate issued after a settlement is paid
 * off. Same editable-template pattern as NOC, its structural sibling.
 */
export default function NdcTemplateSection({ config, defaults, onChange }) {
  const toast = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const paragraphs = config?.paragraphs ?? [];

  function setField(key, value) {
    onChange({ ...config, [key]: value });
  }
  function setParagraph(i, value) {
    const next = [...paragraphs];
    next[i] = value;
    onChange({ ...config, paragraphs: next });
  }
  function addParagraph() {
    onChange({ ...config, paragraphs: [...paragraphs, ""] });
  }
  function removeParagraph(i) {
    onChange({ ...config, paragraphs: paragraphs.filter((_, idx) => idx !== i) });
  }
  function restoreDefaults() {
    onChange({ ...defaults });
    toast.success("Restored the default NDC template — remember to Save Changes.");
  }

  async function openPreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/ndc/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: config }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Could not generate preview.");
        return;
      }
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewOpen(true);
    } catch {
      toast.error("Network error — could not generate preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-dark">
            <CiIcon name="doc" size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="font-display text-sm font-bold text-gray-800">NDC Template</div>
            <div className="mt-0.5 text-xs text-gray-500">The No Dues Certificate issued after a settlement is paid off</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={restoreDefaults}>
            Restore Default
          </button>
          <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={openPreview} disabled={previewLoading}>
            {previewLoading ? (
              <>
                <Spinner size={12} /> Rendering…
              </>
            ) : (
              <>
                <CiIcon name="eye" size={13} strokeWidth={2} />
                Preview
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-accent-light bg-accent-light/40 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          <span className="mt-0.5 shrink-0 text-accent">ⓘ</span>
          <div>
            <p>Use these tokens anywhere below — filled in with the real settlement's details when an NDC is generated or emailed:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PLACEHOLDER_HINTS.map(([token, label]) => (
                <span key={token} title={label} className="rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-accent-dark">
                  {token}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Field label="Title" value={config.title} onChange={(v) => setField("title", v)} />
        <Field label="Salutation" value={config.salutation} onChange={(v) => setField("salutation", v)} />
        <Field label="Greeting" value={config.greeting} onChange={(v) => setField("greeting", v)} />

        <div>
          <label className="label">Body Paragraphs</label>
          <div className="space-y-2.5">
            {paragraphs.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-gray-400">
                  {i + 1}
                </span>
                <textarea
                  className="input min-h-[64px] flex-1 resize-y text-[13px] leading-relaxed"
                  value={p}
                  onChange={(e) => setParagraph(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeParagraph(i)}
                  className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-danger"
                  aria-label="Remove paragraph"
                >
                  <CiIcon name="x" size={12} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addParagraph}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-accent/50 px-3 py-1.5 text-xs font-semibold text-accent-dark transition hover:bg-accent-light"
          >
            <CiIcon name="plus" size={12} strokeWidth={2.5} />
            Add Paragraph
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Closing — Line 1" value={config.closingRegards} onChange={(v) => setField("closingRegards", v)} />
          <Field label="Closing — Line 2" value={config.closingTeam} onChange={(v) => setField("closingTeam", v)} />
          <Field label="Closing — Company" value={config.closingCompany} onChange={(v) => setField("closingCompany", v)} />
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={closePreview}
        size="full"
        title="NDC Preview — sample loan data"
        footer={
          <button type="button" className="btn-primary" onClick={closePreview}>
            Close
          </button>
        }
      >
        {previewUrl && <iframe src={previewUrl} title="NDC preview" className="h-[75vh] w-full rounded-lg border border-line" />}
      </Modal>
    </div>
  );
}
