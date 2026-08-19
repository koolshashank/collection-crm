"use client";

import { useEffect, useState } from "react";
import { CiIcon } from "@/components/client-info/icons";

/**
 * A quick, sticky-note styled way to jot down what happened on a call or
 * any other interaction with the customer. No backend yet — the saved
 * note is handed to the parent via onSave() and kept for the session
 * until a persistence API is wired up.
 */
export default function AddNoteModal({ author, onClose, onSave }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const trimmed = text.trim();

  function save() {
    if (!trimmed) return;
    onSave?.(trimmed);
    onClose?.();
  }

  function keyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
  }

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rotate-[-0.4deg] overflow-hidden rounded-2xl border border-[#f0dfa0] bg-[#fffdf5] shadow-2xl">
        {/* Header — warm "sticky note" gradient with a pin */}
        <div className="relative bg-gradient-to-br from-[#f5b942] to-[#e8973d] px-5 py-4">
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-sm" />
          <div className="flex items-center gap-2.5 text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <CiIcon name="doc" size={16} strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold leading-tight">Jot a Note</p>
              <p className="text-[11px] text-white/80">What happened with the customer?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Ruled-paper textarea */}
        <div className="px-5 pt-4">
          <textarea
            autoFocus
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 600))}
            onKeyDown={keyDown}
            placeholder="e.g. Spoke with customer at 4pm, promised to pay ₹5,000 by Friday. Sounded cooperative…"
            className="w-full resize-none rounded-lg border-0 bg-transparent py-1 text-[13.5px] leading-[26px] text-gray-800 outline-none placeholder:text-gray-400"
            style={{
              backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 25px, #f0e6c8 26px)",
              backgroundPosition: "0 4px",
            }}
          />
          <div className="mt-1 flex items-center justify-between border-t border-dashed border-[#e8dcae] pt-1.5 pb-3.5">
            <span className="text-[11px] text-gray-400">{author ? `— ${author}` : ""}</span>
            <span className="text-[11px] text-gray-400">{text.length} / 600</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#f0e6c8] bg-[#fdf6e3] px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#f5b942] to-[#e8973d] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
            onClick={save}
            disabled={!trimmed}
          >
            <CiIcon name="check" size={14} strokeWidth={2.5} />
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
