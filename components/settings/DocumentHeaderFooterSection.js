"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_HEADER_URL = "/assets/noc_header.jpg";
const DEFAULT_FOOTER_URL = "/assets/noc_Footer.jpg";

const DocIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="h-5 w-5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);

function ImageSlot({ label, hint, url, defaultUrl, uploading, onUpload, onRemove }) {
  const src = url || defaultUrl;
  return (
    <div>
      <label className="label">{label}</label>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="block h-auto w-full" />
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <label className="btn-secondary cursor-pointer text-xs">
          {uploading ? "Uploading…" : url ? "Replace Image" : "Upload Image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
        {url && (
          <button type="button" className="text-xs font-semibold text-danger hover:underline" onClick={onRemove}>
            Reset to Default
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

/**
 * Document Header/Footer card — lets an admin replace the banner images
 * stamped onto every page of the NOC PDF (and its on-screen preview) from
 * this page, instead of swapping files on disk by hand. Shows whatever is
 * currently in effect (a previously uploaded image, or the bundled default)
 * as the preview, so it's clear what customers see today before changing it.
 */
export default function DocumentHeaderFooterSection({ config, onChange }) {
  const { success, error: toastError } = useToast();
  const [uploading, setUploading] = useState(null); // "header" | "footer" | null

  async function handleUpload(slot, file) {
    if (!file) return;
    setUploading(slot);
    const fd = new FormData();
    fd.append("slot", slot);
    fd.append("image", file);
    const res = await clientFetch("/api/config/document-header-footer/upload", { method: "POST", body: fd });
    setUploading(null);
    if (res.ok && res.data?.success) {
      onChange({
        ...config,
        [slot === "header" ? "headerUrl" : "footerUrl"]: res.data.url,
        [slot === "header" ? "headerFormat" : "footerFormat"]: res.data.format,
      });
      success(`${slot === "header" ? "Header" : "Footer"} image uploaded — hit Save to apply it.`);
    } else {
      toastError(res.data?.message || "Upload failed.");
    }
  }

  function handleRemove(slot) {
    onChange({
      ...config,
      [slot === "header" ? "headerUrl" : "footerUrl"]: null,
      [slot === "header" ? "headerFormat" : "footerFormat"]: null,
    });
  }

  const cacheBust = config?.updatedAt ? `?v=${encodeURIComponent(config.updatedAt)}` : "";

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
          <span className="text-accent">
            <DocIcon color="currentColor" />
          </span>
          Document Header &amp; Footer
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          Used on the NOC certificate PDF — replace the banner images anytime, no code changes needed
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
        <ImageSlot
          label="Header Image"
          hint="Shown at the top of every page. Full-width banner — JPEG, PNG or WEBP, up to 3MB."
          url={config?.headerUrl ? `${config.headerUrl}${cacheBust}` : null}
          defaultUrl={`${DEFAULT_HEADER_URL}${cacheBust}`}
          uploading={uploading === "header"}
          onUpload={(e) => {
            const file = e.target.files?.[0];
            handleUpload("header", file);
            e.target.value = "";
          }}
          onRemove={() => handleRemove("header")}
        />
        <ImageSlot
          label="Footer Image"
          hint="Shown at the bottom of every page. Full-width banner — JPEG, PNG or WEBP, up to 3MB."
          url={config?.footerUrl ? `${config.footerUrl}${cacheBust}` : null}
          defaultUrl={`${DEFAULT_FOOTER_URL}${cacheBust}`}
          uploading={uploading === "footer"}
          onUpload={(e) => {
            const file = e.target.files?.[0];
            handleUpload("footer", file);
            e.target.value = "";
          }}
          onRemove={() => handleRemove("footer")}
        />
      </div>

      <div className="border-t border-line px-5 py-4">
        <label className="label">Fallback Footer Text</label>
        <input
          type="text"
          className="input"
          placeholder="RBI Registered NBFC | +91-8595333222 | Info@blinkrloan.com"
          value={config?.footerText ?? ""}
          onChange={(e) => onChange({ ...config, footerText: e.target.value })}
        />
        <p className="mt-1.5 text-xs text-gray-400">Only used if the footer image above fails to load.</p>
      </div>
    </div>
  );
}
