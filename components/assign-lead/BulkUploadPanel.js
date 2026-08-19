"use client";

import { useRef, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

/**
 * Bulk CSV Upload panel — mirror of the assign_lead.php upload panel.
 * Posts multipart form-data (field `bulkFile`) to /api/assign/bulk
 * (proxy for bulkAssignProcess.php).
 */
export default function BulkUploadPanel({ onUploaded, open: openProp, onToggle }) {
  const { success, error } = useToast();
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  function toggleOpen() {
    if (isControlled) onToggle?.(!open);
    else setOpenState((o) => !o);
  }
  const [file, setFile] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  function pickFile(f) {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext !== "csv") {
      error("Please select a valid .csv file only.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > 5) {
      error("File too large (" + sizeMB.toFixed(2) + " MB). Max 5 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  function reset() {
    setFile(null);
    setProgress(0);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      error("Please select a CSV file first.");
      return;
    }
    setUploading(true);
    setProgress(0);
    // Simulated progress, same as the PHP page's bar
    timerRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 250);

    const fd = new FormData();
    fd.append("bulkFile", file);
    const res = await clientFetch("/api/assign/bulk", { method: "POST", body: fd }, 60000);

    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setUploading(false);

    if (res.ok && res.data?.success !== false) {
      success(res.data?.message || "Bulk assignment uploaded successfully");
      reset();
      onUploaded?.();
    } else {
      error(res.data?.message || res.error || "Upload failed. Try again.");
      setProgress(0);
    }
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-accent/40 bg-white transition-colors hover:border-accent">
      {/* Toggle head */}
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-accent-light/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">Bulk CSV Upload</div>
            <div className="text-xs text-gray-500">Upload a CSV file to assign multiple leads to agents at once</div>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <form onSubmit={submit} className="border-t border-line px-5 pb-5">
          {/* Drop zone */}
          <div
            className={`relative mt-4 cursor-pointer rounded-xl border-[1.5px] border-dashed p-7 text-center transition ${
              dragover ? "border-accent bg-accent-light" : "border-line bg-surface hover:border-accent hover:bg-accent-light/50"
            }`}
            onDragEnter={(e) => { e.preventDefault(); setDragover(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragover(false);
              if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              name="bulkFile"
              accept=".csv,text/csv"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => e.target.files.length && pickFile(e.target.files[0])}
            />
            <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <polyline points="9 14 12 11 15 14" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-gray-800">Drop your CSV file here</div>
            <div className="mt-1 text-xs text-gray-500">or click to browse from your computer</div>
            {file && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-accent-dark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{file.name}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-accent-light">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-light to-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 text-center text-xs text-gray-500">Uploading… {Math.round(progress)}%</div>
            </div>
          )}

          {/* Footer: hints + actions */}
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="text-xs leading-7 text-gray-500">
              <strong className="text-gray-600">CSV Format Requirements:</strong>
              <br />• Required columns:{" "}
              <code className="rounded bg-accent-light px-1 py-0.5 font-mono text-[11px] text-accent-dark">loan_id</code>,{" "}
              <code className="rounded bg-accent-light px-1 py-0.5 font-mono text-[11px] text-accent-dark">employee_id</code>
              <br />• First row must be the header row
              <br />• Maximum file size: <strong className="text-gray-600">5 MB</strong> &nbsp;·&nbsp; Accepted format:{" "}
              <strong className="text-gray-600">.csv</strong> only
              <br />•{" "}
              <a href="/sample_bulk_assign.csv" download className="font-semibold text-accent no-underline">
                ↓ Download sample CSV template
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" onClick={reset}>
                Clear
              </button>
              <button type="submit" className="btn-primary" disabled={!file || uploading}>
                {uploading ? "Uploading…" : "Upload & Assign"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
