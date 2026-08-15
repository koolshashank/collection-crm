"use client";

import { useMemo } from "react";
import Modal from "@/components/ui/Modal";

const MAX_PREVIEW_ROWS = 100;

function humanize(key) {
  return String(key)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function renderCell(v) {
  if (v === null || v === undefined || v === "") return <span className="text-gray-300">—</span>;
  if (typeof v === "object") return <span className="text-xs">{JSON.stringify(v)}</span>;
  return String(v);
}

/** Read-only preview of what will land in the CSV. Columns come from the data. */
export default function PreviewModal({ open, onClose, title, rows = [], onExport }) {
  const columns = useMemo(() => {
    const seen = [];
    for (const row of rows.slice(0, MAX_PREVIEW_ROWS)) {
      if (!row || typeof row !== "object") continue;
      for (const k of Object.keys(row)) if (!seen.includes(k)) seen.push(k);
    }
    return seen;
  }, [rows]);

  const shown = rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={title}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            Showing {shown.length.toLocaleString("en-IN")} of{" "}
            {rows.length.toLocaleString("en-IN")} rows
            {rows.length > MAX_PREVIEW_ROWS ? " — the CSV contains all of them" : ""}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={onExport}>
              ⬇ Export CSV
            </button>
            <button type="button" className="btn-primary !py-1.5 text-xs" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs text-gray-400">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="th">#</th>
                {columns.map((c) => (
                  <th key={c} className="th whitespace-nowrap">
                    {humanize(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-line last:border-0 ${i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white"}`}
                >
                  <td className="td text-xs text-gray-400">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c} className="td whitespace-nowrap">
                      {renderCell(row?.[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
