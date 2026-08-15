"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/Feedback";
import StepTracker from "@/components/noc/StepTracker";
import LoanDetailsCard from "@/components/noc/LoanDetailsCard";
import NocActionsPanel from "@/components/noc/NocActionsPanel";
import NocDocPreview from "@/components/noc/NocDocPreview";

/**
 * NOC Generator — port of noc.php (client logic).
 * Same flows: search loan → verify details → preview/generate PDF →
 * email to customer. All labels, hints, toasts and status messages
 * are copied verbatim from the PHP page's inline JS.
 */
export default function NocClient({ userName }) {
  const { success: toastSuccess, error: toastError } = useToast();

  /* ── STATE ── */
  const [loanNo, setLoanNo] = useState("");
  const [loanData, setLoanData] = useState(null);
  const [hint, setHint] = useState({ msg: "Enter the loan number to fetch borrower details", cls: "" });
  const [inputState, setInputState] = useState(""); // "" | "error" | "success"
  const [fetching, setFetching] = useState(false);
  const [step, setStep] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [actionStatus, setActionStatus] = useState({ msg: "", color: "" });
  const [form, setForm] = useState({
    nocDate: new Date().toISOString().split("T")[0],
    nocAuth: userName || "",
    nocRemarks: "",
    nocEmail: "",
    nocSubject: "No Objection Certificate : Loan Closure Confirmation",
  });

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const isClosed = String(loanData?.loan_status || "").toLowerCase() === "closed";
  const canIssue = Boolean(loanData) && isClosed;

  /* ── LOAN INPUT (uppercase, strip spaces, reset state) ── */
  function onLoanInput(v) {
    setLoanNo(v.toUpperCase().replace(/\s/g, ""));
    setInputState("");
    setHint({ msg: "Enter the loan number to fetch borrower details", cls: "" });
    setLoanData(null);
    setActionStatus({ msg: "", color: "" });
    setStep(1);
  }

  /* ── FETCH LOAN ── */
  async function fetchLoan() {
    const value = loanNo.trim();
    if (!value) {
      setInputState("error");
      setHint({ msg: "Please enter a loan number", cls: "err" });
      return;
    }
    setFetching(true);
    setHint({ msg: "Fetching loan details…", cls: "" });

    const res = await clientFetch("/api/noc/fetch?loan_no=" + encodeURIComponent(value));
    setFetching(false);

    if (res.status === 0) {
      setHint({ msg: "Network error — try again", cls: "err" });
      toastError("Network error. Please try again.");
      return;
    }
    const body = res.data || {};
    if (!body.success) {
      setInputState("error");
      setHint({ msg: body.message || "Loan not found", cls: "err" });
      toastError(body.message || "Loan not found");
      return;
    }

    const d = body.data;
    setLoanData(d);
    setInputState("success");
    setHint({ msg: "✓ Loan found — " + (d.full_name || ""), cls: "ok" });

    /* Pre-fill email + NOC date (same as renderDetails) */
    const emails = [];
    if (d.personal_email) emails.push(d.personal_email);
    if (d.office_email && d.office_email !== d.personal_email) emails.push(d.office_email);
    setForm((f) => ({
      ...f,
      nocEmail: emails[0] || "",
      nocDate: new Date().toISOString().split("T")[0],
    }));

    setStep(2);
    toastSuccess("Loan details fetched successfully");
  }

  /* ── FormData shared by generate + email (identical param names) ── */
  function buildFormData() {
    const fd = new FormData();
    fd.append("loan_no", loanData.loan_no || "");
    fd.append("full_name", loanData.full_name || "");
    fd.append("pan", loanData.pan || "");
    fd.append("mobile", loanData.mobile || "");
    fd.append("loan_amount", loanData.loan_amount || 0);
    fd.append("repay_amount", loanData.repayment_amount || 0);
    fd.append("collected", loanData.collection_amount || 0);
    fd.append("coll_amount", loanData.collection_amount || 0);
    fd.append("sanc_date", loanData.sanction_date || "");
    fd.append("repay_date", loanData.repayment_date || "");
    fd.append("coll_date", loanData.collection_date || "");
    fd.append("tenure", loanData.tenure || "");
    fd.append("waiver", loanData.waiver_amount || 0);
    fd.append("noc_date", form.nocDate);
    fd.append("auth_by", form.nocAuth);
    fd.append("remarks", form.nocRemarks);
    return fd;
  }

  /* ── PREVIEW NOC ── */
  function previewNOC() {
    if (!loanData) return;
    setShowModal(true);
    setStep(3);
  }

  /* ── GENERATE PDF (download) ── */
  async function generateNOC() {
    if (!loanData) {
      toastError("Fetch loan details first");
      return;
    }
    setGenerating(true);
    setActionStatus({ msg: "Generating PDF…", color: "#1a5276" });
    try {
      const res = await fetch("/api/noc/generate", {
        method: "POST",
        body: buildFormData(),
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "NOC_" + (loanData.loan_no || "loan").replace(/[^A-Z0-9_-]/gi, "_") + ".pdf";
      link.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
      setActionStatus({ msg: "✓ PDF downloaded successfully", color: "#3a7d5a" });
      setStep(4);
      setShowModal(false);
      toastSuccess("NOC PDF downloaded successfully");
    } catch (err) {
      setGenerating(false);
      setActionStatus({ msg: "PDF generation failed — " + (err?.message || "error"), color: "#c0392b" });
      toastError("PDF generation failed. Check server.");
    }
  }

  /* ── SEND EMAIL ── */
  async function sendEmail() {
    if (!loanData) {
      toastError("Fetch loan details first");
      return;
    }
    const email = form.nocEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailInvalid(true);
      toastError("Please enter a valid email address");
      setTimeout(() => setEmailInvalid(false), 1800);
      return;
    }

    setEmailing(true);
    setActionStatus({ msg: "Sending email…", color: "#1a5276" });

    const fd = buildFormData();
    fd.append("lead_id", loanData.lead_id || "");
    fd.append("to_email", email);
    fd.append("subject", form.nocSubject || "No Objection Certificate");

    const res = await clientFetch("/api/noc/email", { method: "POST", body: fd }, 60000);
    setEmailing(false);

    if (res.status === 0) {
      setActionStatus({ msg: "Network error sending email", color: "#c0392b" });
      toastError("Network error. Check server logs.");
      return;
    }
    const body = res.data || {};
    if (body.success) {
      setActionStatus({
        msg: "✓ Email sent to " + email + (body.s3_url ? " — archived to S3" : ""),
        color: "#3a7d5a",
      });
      setStep(4);
      setShowModal(false);
      toastSuccess("NOC emailed to " + email);
    } else {
      setActionStatus({ msg: "Email failed: " + (body.message || "Unknown error"), color: "#c0392b" });
      toastError(body.message || "Email failed");
    }
  }

  const hintColor = hint.cls === "err" ? "text-danger" : hint.cls === "ok" ? "text-accent-dark" : "text-gray-400";

  return (
    <>
      {/* Page header */}
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        No Objection Certificate
      </div>
      <PageHeader
        title="NOC Generator"
        subtitle="Generate and dispatch No Objection Certificates for fully settled loans"
        actions={
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Reset
          </button>
        }
      />

      {/* Step tracker */}
      <StepTracker step={step} />

      {/* Search card */}
      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2 font-display text-base font-bold text-gray-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" className="text-navy">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search Loan Account
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="loanNoInput">
              Loan Number / Loan ID
            </label>
            <input
              id="loanNoInput"
              className={`input tracking-wider ${
                inputState === "error" ? "!border-danger" : inputState === "success" ? "!border-accent" : ""
              }`}
              type="text"
              placeholder="e.g. BLKR00021946"
              autoComplete="off"
              spellCheck={false}
              value={loanNo}
              onChange={(e) => onLoanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLoan()}
            />
            <div className={`mt-1.5 min-h-[16px] text-[11px] ${hintColor}`}>{hint.msg}</div>
          </div>
          <button
            className="btn-primary sm:mb-[21px] justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={fetching}
            onClick={fetchLoan}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Fetch Details
            {fetching && (
              <span className="ml-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
          </button>
        </div>
      </div>

      {loanData ? (
        /* Main grid */
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_360px]">
          <LoanDetailsCard d={loanData} />
          <NocActionsPanel
            values={form}
            onChange={setField}
            canIssue={canIssue}
            generating={generating}
            emailing={emailing}
            emailInvalid={emailInvalid}
            onPreview={previewNOC}
            onGenerate={generateNOC}
            onEmail={sendEmail}
            actionStatus={actionStatus}
          />
        </div>
      ) : (
        /* Empty state (shown before search) */
        <div className="flex flex-col items-center justify-center px-7 py-16 text-center">
          <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-[0_0_0_12px_rgba(26,82,118,.05)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" className="text-navy">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <polyline points="9 15 12 18 15 15" />
              <line x1="12" y1="11" x2="12" y2="18" />
            </svg>
          </div>
          <div className="mb-1.5 font-display text-lg text-gray-800">Enter a loan number above</div>
          <div className="max-w-[280px] text-xs leading-relaxed text-gray-400">
            The system will fetch borrower details, verify loan closure, and prepare the NOC document ready for
            download or email.
          </div>
        </div>
      )}

      {/* NOC PREVIEW MODAL */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="NOC Preview"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>
              Close
            </button>
            <button
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={generating}
              onClick={generateNOC}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
            <button
              className="btn-primary bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
              disabled={emailing}
              onClick={sendEmail}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email to Customer
            </button>
          </>
        }
      >
        <NocDocPreview d={loanData} nocDate={form.nocDate} remarks={form.nocRemarks} />
      </Modal>
    </>
  );
}
