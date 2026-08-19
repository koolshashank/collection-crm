"use client";

import { useState } from "react";
import { CiIcon } from "./icons";
import { ciInitials, ciSafe, ciInr, DPD_SEGS, dpdFilledSegs } from "./helpers";

/**
 * Hero — identity, status stamp, KPI strip, DPD health strip + priority badge.
 * 1:1 port of the .ci-hero block in client_info.php.
 */
export default function HeroSection({ loan, leadId, statusMeta, priority }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const dpdNum = Number(loan.overdue_days) || 0;
  const filled = dpdFilledSegs(dpdNum);
  /* No dedicated customer selfie exists in this system — the closest thing on
     record is the Aadhaar card scan (which has a small ID photo on it), so
     that's what we show here, with the initials tile as a graceful fallback. */
  const showPhoto = Boolean(leadId) && !photoFailed;

  const kpis = [
    { label: "Loan Amount", value: ciInr(loan.loan_amount ?? 0), tone: "" },
    { label: "Repayment Due", value: ciInr(loan.repayment_amount ?? 0), tone: "" },
    { label: "Collected So Far", value: ciInr(loan.collection_amount ?? 0), tone: "good" },
    { label: "Overdue Days", value: ciSafe(loan.overdue_days ?? "0"), tone: dpdNum > 0 ? "warn" : "" },
  ];

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-[#192544] to-[#12213c] p-5 sm:p-6">
      {/* decorative ring */}
      <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full border border-accent/20" />

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Back"
          >
            <CiIcon name="back" strokeWidth={2} />
          </button>
          <div className="relative flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark font-display text-xl font-bold text-white shadow-lg shadow-accent/30 ring-2 ring-white/15">
            {showPhoto ? (
              <img
                src={`/api/docs/aadhar?lead_id=${encodeURIComponent(leadId)}`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-left"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              ciInitials(loan.full_name ?? "")
            )}
          </div>
          <div>
            <div className="font-display text-xl leading-tight text-white sm:text-2xl">
              {ciSafe(loan.full_name)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55 sm:text-[13px]">
              <span>
                Loan <strong className="font-semibold text-accent">{ciSafe(loan.loan_no)}</strong>
              </span>
              <span>· Lead {ciSafe(leadId)}</span>
              <span
                className="inline-flex items-center rounded border-[1.5px] px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider"
                style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: "currentColor" }}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" />
      </div>

      {/* KPI strip */}
      <div className="relative z-[1] mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{k.label}</div>
            <div
              className={`mt-1 font-display text-lg sm:text-xl ${
                k.tone === "warn" ? "text-amber" : k.tone === "good" ? "text-accent" : "text-white"
              }`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* DPD severity strip + Collection Priority */}
      <div className="relative z-[1] mt-4 flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <div className="flex gap-[3px]">
            {Array.from({ length: DPD_SEGS }).map((_, si) => (
              <div
                key={si}
                className="h-1.5 flex-1 rounded"
                style={{ background: si < filled ? priority.color : "rgba(255,255,255,.15)" }}
              />
            ))}
          </div>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold"
          style={{ color: priority.color, background: priority.bg, borderColor: "currentColor" }}
        >
          {priority.label} Priority
        </span>
      </div>
    </div>
  );
}
