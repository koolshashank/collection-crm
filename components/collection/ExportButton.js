"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

/**
 * "Export to Excel" — mirror of collection.php's coExportExcel().
 * Pulls EVERY filtered lead (all pages) via /api/collection/export, which
 * streams back the same workbook the old page built with SheetJS:
 * collection_report_{startDate}_to_{endDate}.xlsx
 */
export default function ExportButton({ startDate, endDate, search }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Export to Excel");

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    setLabel("Fetching all records…");
    try {
      const qs = new URLSearchParams({ startDate, endDate, search });
      const res = await fetch(`/api/collection/export?${qs.toString()}`, { credentials: "same-origin" });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        let msg = "No records found to export for the current filters.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {
          /* keep default message */
        }
        toast.error(msg);
        return;
      }
      if (!res.ok) {
        toast.error("Network error while exporting. Please try again.");
        return;
      }

      setLabel("Building file…");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `collection_report_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Network error while exporting. Please try again.");
    } finally {
      setBusy(false);
      setLabel("Export to Excel");
    }
  }

  return (
    <button
      onClick={exportExcel}
      disabled={busy}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#a8d4ef] bg-[#e8f4fd] px-3.5 py-2 text-[0.81rem] font-medium text-info transition hover:bg-info hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? (
        <Spinner size={13} className="border-current border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[13px] w-[13px]">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
