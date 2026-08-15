"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { CiIcon } from "./icons";
import ManualDialerPane from "./ManualDialerPane";

/* Same inr() as lpCallBuildUI */
function inr(n) {
  n = parseFloat(n) || 0;
  if (n >= 1e5) return "Rs " + (n / 1e5).toFixed(2) + " L";
  return "Rs " + n.toLocaleString("en-IN");
}

const CALL_RESPONSES = ["Connected", "Not Connected", "Busy", "Switched Off", "Invalid Number", "Call Back Later"];
const DISPOSITIONS = [
  "PTP  Promise to Pay", "Broken PTP", "Paid", "Dispute", "Not Interested", "Legal Notice Sent",
  "Number Not Working", "Language Barrier", "Will Pay Later", "Settled", "Already Paid",
];

/**
 * Calling Modal — port of the lead.php calling modal embedded in
 * client_info.php (Dialer / Manual Call / ConVox Line tabs, disposition
 * form, ConVox click-to-call, mic checks). Opens directly on the ConVox
 * tab with the dial button disabled for 6s while the softphone registers,
 * exactly like the PHP page.
 */
export default function CallModal({ open, onClose, loan, leadId }) {
  const toast = useToast();
  const lpToast = useCallback((msg, ok) => (ok ? toast.success(msg) : toast.error(msg)), [toast]);

  const name = loan.full_name ?? "";
  const loanId = loan.loan_no ?? "";
  const mobile = loan.mobile ?? "";
  const altMobile = loan.alternate_mobile ?? "";
  const claimAmt = parseFloat(loan.penalty_amount) || 0;
  const principal = parseFloat(loan.principal_outstanding) || 0;
  const dpd = parseInt(loan.overdue_days) || 0;
  const loanAmt = parseFloat(loan.loan_amount) || 0;

  const [tab, setTab] = useState("convox");
  const [activeNum, setActiveNum] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [callsDone, setCallsDone] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [micAlert, setMicAlert] = useState(null);
  const [status, setStatus] = useState("Select a number and click CALL to start");
  const [form, setForm] = useState({ call_type: "applicant", call_response: "", committed_amount: "", reminder: "", disposition: "" });
  const [dialBtn, setDialBtn] = useState({ disabled: false, label: "DIAL VIA CONVOX" });
  const [convoxUrl, setConvoxUrl] = useState(undefined); // undefined = not fetched yet
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const convoxFetched = useRef(false);

  const contacts = [];
  if (mobile) contacts.push({ num: mobile, type: "Primary" });
  if (altMobile) contacts.push({ num: altMobile, type: "Alternate" });

  /* ── Open: reset everything (lpOpenCalling) ── */
  useEffect(() => {
    if (!open) return;
    clearInterval(timerRef.current);
    setTab("convox");
    setActiveNum(mobile || "");
    setCallActive(false);
    setTimerSec(0);
    setCallsDone(0);
    setSubmitting(false);
    setForm({ call_type: "applicant", call_response: "", committed_amount: "", reminder: "", disposition: "" });
    setStatus("Dial from ConVox, then submit disposition below");
    checkMicrophone();

    /* Load ConVox widget URL once (server-side SSO — includes/convox_sso.php) */
    if (!convoxFetched.current) {
      convoxFetched.current = true;
      clientFetch("/api/convox/widget-url").then((res) => {
        setConvoxUrl(res.data?.success ? res.data.url || null : null);
      });
    }

    /* Give the softphone time to register with Asterisk before allowing
       Click-to-Call — avoids "missed call: station not registered" */
    setDialBtn({ disabled: true, label: "Registering…" });
    const t = setTimeout(() => setDialBtn({ disabled: false, label: "DIAL VIA CONVOX" }), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  /* ── Microphone check (lpCheckMicrophone) ── */
  function checkMicrophone() {
    setMicOk(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicAlert("Your browser does not support microphone access.");
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((result) => {
          if (result.state === "granted") {
            setMicOk(true);
            setMicAlert(null);
          } else if (result.state === "denied") {
            setMicAlert("Microphone is blocked. Please enable it in browser settings to make calls.");
          } else {
            setMicOk(true);
            setMicAlert(null);
          }
        })
        .catch(() => {
          setMicOk(true);
          setMicAlert(null);
        });
    } else {
      setMicOk(true);
      setMicAlert(null);
    }
  }

  function requestMic() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicOk(true);
        setMicAlert(null);
        setStatus("Microphone enabled  ready to call");
        lpToast("Microphone enabled", true);
      })
      .catch(() => {
        setMicAlert("Microphone access denied. Please enable it in your browser  Site Settings  Microphone.");
        setMicOk(false);
      });
  }

  /* ── Call start / end (lpStartCall / lpEndCall) ── */
  function startCall(viaApi) {
    if (!activeNum) return lpToast("No number selected", false);
    setCallActive(true);
    setTimerSec(0);
    setStatus(viaApi ? "Call placed via ConVox to " + activeNum : "Calling " + activeNum + "");
    timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000);
    if (!viaApi) {
      try {
        const tel = document.createElement("a");
        tel.href = "tel:" + activeNum;
        tel.click();
      } catch {}
    }
  }

  function endCall() {
    setCallActive(false);
    setCallsDone((c) => c + 1);
    clearInterval(timerRef.current);
    setStatus("Call ended  Fill disposition and submit");
  }

  function toggleCall() {
    if (!micOk) return requestMic();
    if (callActive) endCall();
    else startCall(false);
  }

  /* ── DIAL VIA CONVOX (lpConvoxApiDial → /api/convox/click-to-call) ── */
  async function convoxApiDial() {
    if (!activeNum) return lpToast("No number selected", false);
    if (callActive) return lpToast("A call is already in progress.", false);
    setDialBtn({ disabled: true, label: "Dialing…" });
    const refno = loanId || leadId || "LEAD" + Date.now();
    const res = await postJson("/api/convox/click-to-call", { phone_number: activeNum, refno });
    setDialBtn({ disabled: false, label: "DIAL VIA CONVOX" });
    if (res.status === 0) return lpToast("Network error — could not reach ConVox.", false);
    if (res.data?.success) {
      lpToast(res.data.message || "Call placed via ConVox!", true);
      startCall(true);
    } else {
      lpToast(res.data?.message || "Could not place call via ConVox.", false);
    }
  }

  /* ── Submit disposition (lpSubmitDisposition → /api/disposition/submit) ── */
  async function submitDisposition() {
    if (!form.disposition) return;
    setSubmitting(true);
    const res = await postJson("/api/disposition/submit", {
      lead_id: leadId,
      loan_id: loanId,
      contact_number: activeNum,
      call_type: form.call_type,
      call_response: form.call_response,
      committed_amount: form.committed_amount,
      reminder: form.reminder,
      disposition: form.disposition,
      call_duration: timerSec,
      calls_done: callsDone,
    });
    setSubmitting(false);
    if (res.status === 0) return lpToast("Network error  please try again", false);
    if (res.data?.success) {
      lpToast("Disposition saved successfully", true);
      close();
    } else {
      lpToast(res.data?.message || "Submission failed", false);
    }
  }

  function close() {
    if (callActive) endCall();
    clearInterval(timerRef.current);
    onClose();
  }

  function switchTab(t) {
    setTab(t);
    if (t === "manual") setStatus("Enter a number and tap the call button");
    else if (t === "convox") setStatus("Dial from ConVox, then submit disposition below");
    else setStatus("Select a number and click CALL to start");
  }

  /* Escape closes */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, callActive]);

  if (!open) return null;

  const canSubmit = form.disposition && !callActive && !submitting;
  const mm = String(Math.floor(timerSec / 60)).padStart(2, "0");
  const ss = String(timerSec % 60).padStart(2, "0");

  /* Loan info grid — 12 cells, verbatim labels */
  const cells = [
    { label: "Name", val: name, cls: "" },
    { label: "Total Claim Amount", val: inr(claimAmt), cls: "text-danger" },
    { label: "Balance Claim Amount", val: inr(claimAmt), cls: "text-danger" },
    { label: "Late Fees", val: "", cls: "" },
    { label: "Overdue EMI", val: "", cls: "" },
    { label: "Settlement Amount", val: "", cls: "" },
    { label: "Call Attempts", val: callsDone, cls: "text-info" },
    { label: "Total Loan Amount", val: inr(loanAmt), cls: "" },
    { label: "Principal Outstanding Amt", val: principal > 0 ? inr(principal) : "", cls: "" },
    { label: "DPD", val: dpd || "", cls: dpd > 60 ? "text-danger" : "text-info" },
    { label: "Loan ID", val: loanId, cls: "text-info" },
    { label: "Calling Status", val: "Initiated", cls: "text-[#1E7E5E]" },
  ];

  const label = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400";
  const input = "input !py-2.5";

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center bg-[rgba(10,12,20,.55)] p-3 backdrop-blur sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex max-h-[92vh] w-full max-w-[1150px] flex-col overflow-y-auto rounded-[20px] bg-white shadow-2xl">
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-lg font-bold text-[#1a1a2e]">
            <CiIcon name="phone" size={18} strokeWidth={2} className="text-[#1E7E5E]" />
            Calling
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={convoxApiDial}
              disabled={dialBtn.disabled}
              className="inline-flex items-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-bold tracking-wide text-white transition hover:bg-[#154e7a] disabled:opacity-50 sm:px-5"
            >
              <CiIcon name={dialBtn.label === "Registering…" || dialBtn.label === "Dialing…" ? "spinner" : "phone"} size={14} strokeWidth={2.5} className={dialBtn.disabled ? "animate-spin" : ""} />
              {dialBtn.label}
            </button>
            <button
              onClick={toggleCall}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide text-white transition sm:px-5 ${
                callActive ? "bg-[#ef4444]" : "bg-[#1E7E5E] hover:bg-[#165f47]"
              }`}
            >
              <CiIcon name={callActive ? "x" : "phone"} size={16} strokeWidth={2.5} />
              {callActive ? "END CALL" : "CALL"}
            </button>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f5] text-gray-500 transition hover:bg-red-50 hover:text-[#ef4444]"
              aria-label="Close"
            >
              <CiIcon name="x" size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Mic alert */}
        {micAlert && (
          <div className="mx-4 mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl border border-[#f59e0b] bg-[#fef3c7] px-4 py-3 text-sm font-medium text-[#92400e] sm:mx-6">
            <CiIcon name="mic" size={18} strokeWidth={2} className="shrink-0 text-[#f59e0b]" />
            <span className="flex-1">{micAlert}</span>
            <button onClick={requestMic} className="rounded-md bg-[#f59e0b] px-3 py-1 text-xs font-bold text-white">
              Enable Mic
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto border-b border-[#e5e7eb] px-4 sm:px-6">
          {[["dialer", "Dialer"], ["manual", "Manual Call"], ["convox", "ConVox Line"]].map(([t, l]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`-mb-px whitespace-nowrap border-b-[2.5px] px-4 py-3 text-[13px] font-semibold uppercase tracking-wide transition ${
                tab === t ? "border-info text-info" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── DIALER PANE ── */}
        {tab === "dialer" && (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Left: contact numbers */}
            <div className="shrink-0 border-b border-[#f0f0f0] py-4 md:w-[210px] md:border-b-0 md:border-r">
              <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Calls Done ({callsDone}/1)
              </div>
              {contacts.length ? (
                contacts.map((c, i) => (
                  <div
                    key={c.num}
                    onClick={() => setActiveNum(c.num)}
                    className={`flex cursor-pointer items-center gap-2.5 border-l-[3px] px-4 py-2.5 transition ${
                      c.num === activeNum ? "border-info bg-[#e8f4fd]" : "border-transparent hover:bg-[#f8f9fc]"
                    }`}
                  >
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#e8f4fd] text-info">
                      <CiIcon name="phone" size={15} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1a1a2e]">{c.num}</div>
                      <div className="text-[11px] text-gray-400">
                        {i + 1}. {c.type}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-gray-400">No numbers on record</div>
              )}
            </div>

            {/* Right: loan details + disposition */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <CiIcon name="screen" size={13} strokeWidth={2} />
                LOAN DETAILS
              </div>
              <div className="mb-1 grid grid-cols-2 overflow-hidden rounded-xl border border-[#e5e7eb] sm:grid-cols-4">
                {cells.map((c) => (
                  <div key={c.label} className="border-b border-r border-[#e5e7eb] px-3.5 py-3 sm:[&:nth-child(4n)]:border-r-0 sm:[&:nth-last-child(-n+4)]:border-b-0">
                    <div className="mb-0.5 text-[11px] font-medium text-gray-400">{c.label}</div>
                    <div className={`text-sm font-semibold text-[#1a1a2e] ${c.cls}`}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div
                className="mb-3.5 cursor-pointer text-right text-xs text-info underline"
                onClick={() => window.open("/collection-dashboard?loan_id=" + encodeURIComponent(loanId), "_blank")}
              >
                MORE DETAILS
              </div>

              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-gray-700">
                <CiIcon name="doc" size={14} strokeWidth={2} className="text-gray-500" />
                Disposition Form
                <span className="rounded-md bg-[#e5e7eb] px-2.5 py-0.5 font-mono text-sm text-gray-700">
                  {mm} : {ss}
                </span>
              </div>

              <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={label}>Contact Number</label>
                  <select className={input} value={activeNum} onChange={(e) => setActiveNum(e.target.value)}>
                    {contacts.length ? (
                      contacts.map((c) => (
                        <option key={c.num} value={c.num}>
                          {c.num} ({c.type})
                        </option>
                      ))
                    ) : (
                      <option>No number</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className={label}>Type</label>
                  <select className={input} value={form.call_type} onChange={(e) => setForm((f) => ({ ...f, call_type: e.target.value }))}>
                    <option value="applicant">Applicant</option>
                    <option value="co_applicant">Co-Applicant</option>
                    <option value="reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Call Response</label>
                  <select className={input} value={form.call_response} onChange={(e) => setForm((f) => ({ ...f, call_response: e.target.value }))}>
                    <option value=""> Select </option>
                    {CALL_RESPONSES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Committed Amount</label>
                  <input
                    type="number"
                    className={input}
                    placeholder=" Amount"
                    value={form.committed_amount}
                    onChange={(e) => setForm((f) => ({ ...f, committed_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={label}>Reminder</label>
                  <input
                    type="datetime-local"
                    className={input}
                    value={form.reminder}
                    onChange={(e) => setForm((f) => ({ ...f, reminder: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={label}>
                    Disposition <span className="text-[#ef4444]">*</span>
                  </label>
                  <select className={input} value={form.disposition} onChange={(e) => setForm((f) => ({ ...f, disposition: e.target.value }))}>
                    <option value="">Select</option>
                    {DISPOSITIONS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MANUAL CALL PANE ── */}
        {tab === "manual" && (
          <ManualDialerPane
            initialNumber={mobile}
            micOk={micOk}
            onRequestMic={requestMic}
            onCallEnded={(sec, num) => {
              setCallsDone((c) => c + 1);
              if (num) setActiveNum(num);
            }}
            onStatus={setStatus}
            toast={lpToast}
          />
        )}

        {/* ── CONVOX WIDGET PANE ── */}
        {tab === "convox" && (
          <div className="relative flex min-h-[640px] flex-1 flex-col bg-white">
            {convoxUrl ? (
              <>
                <div className="flex shrink-0 items-center gap-2.5 border-b border-[#e5e7eb] bg-[#f8f9fc] px-5 py-2.5">
                  <CiIcon name="phone" size={15} strokeWidth={2} className="shrink-0 text-[#1E7E5E]" />
                  <span className="text-[13px] text-gray-700">
                    Dial from ConVox, then fill the disposition on the Dialer tab and submit.
                  </span>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <iframe
                    src={convoxUrl}
                    allow="microphone; autoplay"
                    className="absolute inset-0 h-full w-full border-none bg-white"
                    title="ConVox"
                  />
                </div>
              </>
            ) : convoxUrl === undefined ? (
              <div className="flex min-h-[500px] flex-1 items-center justify-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-accent-light border-t-accent" />
              </div>
            ) : (
              <div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-2.5 text-gray-400">
                <CiIcon name="warn" size={36} strokeWidth={1.5} />
                <span className="text-sm">ConVox widget not available — agent email missing in session.</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-b-[20px] border-t border-[#f0f0f0] bg-[#fafafa] px-4 py-3.5 sm:px-6">
          <div className="text-xs text-gray-400">{status}</div>
          {tab !== "manual" && (
            <button
              onClick={submitDisposition}
              disabled={!canSubmit}
              className={`rounded-lg bg-info px-7 py-2.5 text-sm font-bold tracking-wide text-white transition hover:bg-[#154e7a] ${
                canSubmit ? "" : "pointer-events-none opacity-50"
              }`}
            >
              {submitting ? "Submitting" : "SUBMIT"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
