"use client";

/**
 * Borrower & Loan Details preview card — port of noc.php's .preview-card.
 * Identical labels, value formats (fmtInr Cr/L logic, en-IN dates),
 * status badge and eligibility banner texts.
 */

export function fmtInr(n) {
  n = parseFloat(n || 0);
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + n.toLocaleString("en-IN");
}

export function fmtDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function InfoTile({ label, value, tone = "", className = "" }) {
  const tones = {
    green: "text-accent-dark",
    noc: "text-navy",
    accent: "text-accent-dark",
    "": "text-gray-800",
  };
  return (
    <div className={`rounded-lg border border-transparent bg-surface px-3 py-2.5 transition hover:border-line ${className}`}>
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`break-all text-[13px] font-semibold leading-snug ${tones[tone] || tones[""]}`}>{value}</div>
    </div>
  );
}

export default function LoanDetailsCard({ d }) {
  if (!d) return null;
  const isClosed = String(d.loan_status || "").toLowerCase() === "closed";

  const emails = [];
  if (d.personal_email) emails.push(d.personal_email);
  if (d.office_email && d.office_email !== d.personal_email) emails.push(d.office_email);

  return (
    <div className="card overflow-hidden">
      {/* Head */}
      <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-navy to-[#27406e] px-4 py-3.5">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Borrower &amp; Loan Details
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            isClosed
              ? "border-white/40 bg-white/20 text-white"
              : "border-amber/40 bg-amber/20 text-amber"
          }`}
        >
          {isClosed ? "CLOSED" : String(d.loan_status || "ACTIVE").toUpperCase()}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Eligibility banner */}
        <div
          className={`mb-4 flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] font-semibold ${
            isClosed
              ? "border-accent/30 bg-accent-light text-accent-dark"
              : "border-danger/30 bg-red-50 text-danger"
          }`}
        >
          <span
            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-white ${
              isClosed ? "bg-accent" : "bg-danger"
            }`}
          >
            {isClosed ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </span>
          <span>
            <span className="block">{isClosed ? "Eligible for NOC" : "Not Eligible"}</span>
            <span className="mt-px block text-[11px] font-normal opacity-85">
              {isClosed ? "Loan is fully closed — NOC can be issued" : "Loan must be fully closed before issuing NOC"}
            </span>
          </span>
        </div>

        {/* Info grid */}
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <InfoTile
            label="Applicant Name"
            value={<span className="font-display text-[15px]">{d.full_name || "—"}</span>}
            tone="noc"
            className="sm:col-span-2"
          />
          <InfoTile label="Loan Number" value={d.loan_no || "—"} />
          <InfoTile label="Loan Status" value={String(d.loan_status || "—").toUpperCase()} />
          <InfoTile label="Loan Amount" value={fmtInr(d.loan_amount)} tone="accent" />
          <InfoTile label="Repayment Amount" value={fmtInr(d.repayment_amount)} />
          <InfoTile label="Collected Amount" value={fmtInr(d.collection_amount)} tone="green" />
          <InfoTile label="Collection Date" value={fmtDate(d.collection_date)} />
          <InfoTile label="Sanction Date" value={fmtDate(d.sanction_date)} />
          <InfoTile label="Repayment Date" value={fmtDate(d.repayment_date)} />
          <InfoTile label="Loan Tenure" value={(d.tenure || "—") + (d.tenure ? " Days" : "")} />
          <InfoTile label="Overdue Days" value={(d.overdue_days || "0") + " days"} />
          <InfoTile label="Waiver Amount" value={fmtInr(d.waiver_amount || 0)} />
        </div>

        {/* Email chips */}
        <div className="mb-4">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer Email(s)</div>
          <div className="flex flex-wrap gap-1.5">
            {emails.length ? (
              emails.map((e) => (
                <span
                  key={e}
                  className="inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-info/30 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-info"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {e}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No email on record</span>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mobile</div>
          <div className="text-[13px] font-semibold text-gray-800">{d.mobile || "—"}</div>
        </div>
      </div>
    </div>
  );
}
