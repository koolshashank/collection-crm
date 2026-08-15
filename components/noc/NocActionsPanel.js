"use client";

import Spinner from "@/components/ui/Spinner";

/**
 * NOC Actions panel — port of noc.php's .actions-card.
 * Same fields (NOC Issue Date, Authorised By, Additional Remarks),
 * same buttons (Preview NOC / Download NOC (PDF) / Email NOC to Customer),
 * same email override + subject inputs and status line.
 */
export default function NocActionsPanel({
  values,
  onChange,
  canIssue,
  generating,
  emailing,
  emailInvalid,
  onPreview,
  onGenerate,
  onEmail,
  actionStatus,
}) {
  const { nocDate, nocAuth, nocRemarks, nocEmail, nocSubject } = values;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3.5 flex items-center gap-1.5 font-display text-sm font-bold text-gray-800">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="text-accent">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        NOC Actions
      </div>

      {/* NOC Date */}
      <div className="mb-3">
        <label className="label">NOC Issue Date</label>
        <input
          className="input"
          type="date"
          value={nocDate}
          onChange={(e) => onChange("nocDate", e.target.value)}
        />
      </div>

      {/* Authorised by */}
      <div className="mb-3">
        <label className="label">Authorised By</label>
        <input
          className="input"
          type="text"
          placeholder="e.g. Rajesh Verma, Branch Manager"
          value={nocAuth}
          onChange={(e) => onChange("nocAuth", e.target.value)}
        />
      </div>

      {/* Remarks */}
      <div className="mb-3">
        <label className="label">Additional Remarks (optional)</label>
        <textarea
          className="input min-h-[80px] resize-y leading-relaxed"
          placeholder="Any additional note to include in the NOC body…"
          value={nocRemarks}
          onChange={(e) => onChange("nocRemarks", e.target.value)}
        />
      </div>

      <hr className="my-3.5 border-line" />

      <div className="flex flex-col gap-2.5">
        {/* Preview button */}
        <button
          className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canIssue}
          onClick={onPreview}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview NOC
        </button>

        {/* Generate / Download */}
        <button
          className="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canIssue || generating}
          onClick={onGenerate}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download NOC (PDF)
          {generating && <Spinner size={14} className="ml-1 border-white border-t-transparent" />}
        </button>

        <hr className="my-1 border-line" />

        {/* Email override */}
        <div className="mb-1">
          <label className="label">Send To Email</label>
          <input
            className={`input border-info bg-blue-50 ${emailInvalid ? "!border-danger" : ""}`}
            type="email"
            placeholder="Auto-filled from loan data"
            value={nocEmail}
            onChange={(e) => onChange("nocEmail", e.target.value)}
          />
          <div className="mt-1 text-[11px] text-gray-400">Edit if you want to override the customer email</div>
        </div>

        {/* Email subject */}
        <div className="mb-1">
          <label className="label">Email Subject</label>
          <input
            className="input"
            type="text"
            value={nocSubject}
            onChange={(e) => onChange("nocSubject", e.target.value)}
          />
        </div>

        {/* Send email */}
        <button
          className="btn-primary w-full justify-center bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canIssue || emailing}
          onClick={onEmail}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Email NOC to Customer
          {emailing && <Spinner size={14} className="ml-1 border-white border-t-transparent" />}
        </button>

        {/* Status line */}
        <div className="mt-1 min-h-[18px] text-center text-xs" style={{ color: actionStatus.color || "#9ca3af" }}>
          {actionStatus.msg}
        </div>
      </div>
    </div>
  );
}
