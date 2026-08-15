"use client";

import { useEffect, useRef, useState } from "react";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";
import { callInr } from "./leadUtils";

export default function CallModal({ lead, agentEmail, onClose }) {
  const toast = useToast();
  const [activeNum, setActiveNum] = useState(lead.mobile || "");
  const [dialing, setDialing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [statusText, setStatusText] = useState("Dial from ConVox — disposition is handled inside the widget");
  const [micAlert, setMicAlert] = useState(null);
  const [disposition, setDisposition] = useState("");
  const [followupOn, setFollowupOn] = useState(false);
  const [cbDate, setCbDate] = useState("");
  const [cbHrs, setCbHrs] = useState("");
  const [cbMins, setCbMins] = useState("");
  /* refno / convoxId — set when Click-to-Call succeeds (same as LP_CALL) */
  const callRef = useRef({ refno: "", convoxId: null });
  /* ConVox SSO iframe URL — the PHP embedded convox_widget_url($agentEmail);
     here we resolve it via /api/convox/sso (secrets stay server-side). */
  const [ssoUrl, setSsoUrl] = useState(null);
  const [ssoLoading, setSsoLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await clientFetch("/api/convox/sso");
        if (!alive) return;
        setSsoUrl(res.ok && res.data?.success && res.data?.url ? res.data.url : null);
      } catch {
        if (alive) setSsoUrl(null);
      }
      if (alive) setSsoLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* lpCheckMicrophone — same permission flow */
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicAlert("Your browser does not support microphone access.");
      return;
    }
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((result) => {
          if (result.state === "denied") {
            setMicAlert("Microphone is blocked. Please enable it in browser settings to make calls.");
          } else {
            setMicAlert(null);
          }
        })
        .catch(() => setMicAlert(null));
    }
  }, []);

  const requestMic = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicAlert(null);
        toast.success("Microphone enabled");
      })
      .catch(() =>
        setMicAlert("Microphone access denied. Please enable it in your browser → Site Settings → Microphone.")
      );
  };

  /* lpConvoxApiDial — POST /api/convox/click-to-call { phone_number, refno } */
  const dial = async () => {
    if (!activeNum) { toast.error("No number selected"); return; }
    setDialing(true);
    const refno = lead.loanId || lead.leadId || "LEAD" + Date.now();
    callRef.current.refno = refno; // remember so End Call uses the SAME refno
    const res = await postJson("/api/convox/click-to-call", { phone_number: activeNum, refno });
    setDialing(false);
    if (res.status === 0) {
      toast.error("Network error — could not reach ConVox.");
      return;
    }
    if (res.data?.success) {
      toast.success(res.data.message || "Call placed via ConVox!");
      setStatusText("Call placed to " + activeNum + " — select disposition inside ConVox");
      callRef.current.convoxId = res.data.raw?.convoxid ? res.data.raw.convoxid : null;
    } else {
      toast.error(res.data?.message || "Could not place call via ConVox.");
    }
  };

  /* lpEndCallSubmit — POST /api/convox/end-call, identical payload */
  const endCall = async () => {
    if (!disposition) return toast.error("Please select a disposition");
    if (!activeNum) return toast.error("No number on record");
    if (!callRef.current.convoxId) {
      return toast.error("Please dial via ConVox first — this call was not tracked by our system.");
    }
    const followup = { enabled: followupOn };
    if (followupOn) {
      followup.date = cbDate;
      followup.hrs = cbHrs;
      followup.mins = cbMins;
      if (!followup.date || !followup.hrs || !followup.mins) {
        return toast.error("Please fill callback date, hours and minutes");
      }
    }
    setEnding(true);
    const res = await postJson("/api/convox/end-call", {
      mobile: activeNum,
      refno: callRef.current.refno || lead.loanId || lead.leadId,
      convox_id: callRef.current.convoxId,
      disposition,
      endcall_type: "CLOSE",
      followup,
    });
    setEnding(false);
    if (res.status === 0) return toast.error("Network error — please try again.");
    if (res.data?.success) {
      toast.success(res.data.message || "Call closed!");
      onClose();
    } else {
      toast.error(res.data?.message || "Could not close call.");
    }
  };

  const contacts = [];
  if (lead.mobile) contacts.push({ num: lead.mobile, type: "Primary" });
  if (lead.altMobile) contacts.push({ num: lead.altMobile, type: "Alternate" });

  const infoCells = [
    { label: "Name", val: lead.name, cls: "" },
    { label: "Total Claim Amount", val: callInr(lead.claimAmt), cls: "text-danger" },
    { label: "Total Loan Amount", val: callInr(lead.loanAmt), cls: "" },
    { label: "Principal Outstanding Amt", val: lead.principal > 0 ? callInr(lead.principal) : "", cls: "" },
    { label: "DPD", val: lead.dpd || "", cls: lead.dpd > 60 ? "text-danger" : "text-info" },
    { label: "Loan ID", val: lead.loanId, cls: "text-info" },
  ];

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center bg-navy/60 p-3 backdrop-blur-[4px] sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex h-[94vh] max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-panel shadow-pop">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <span className="flex items-center gap-2 font-display text-lg font-bold text-gray-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent-dark">
              <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.08 4.18 2 2 0 016 2h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L10.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.9.58 2.9.71A2 2 0 0122 16.92z" />
            </svg>
            Calling
          </span>
          <span className="flex items-center gap-2.5">
            <button
              className="btn-primary !bg-info hover:!bg-info/90"
              onClick={dial}
              disabled={dialing}
            >
              {dialing ? "Dialing…" : "DIAL VIA CONVOX"}
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition hover:bg-red-50 hover:text-danger"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </span>
        </div>

        {/* Mic alert */}
        {micAlert && (
          <div className="mx-5 mt-3 flex items-center gap-2.5 rounded-xl border border-amber bg-amber/10 px-4 py-3 text-sm font-medium text-amber">
            <span>{micAlert}</span>
            <button
              className="ml-auto rounded-md bg-amber px-3 py-1 text-xs font-bold text-white"
              onClick={requestMic}
            >
              Enable Mic
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* LEFT panel — customer / loan info */}
          <div className="w-full shrink-0 overflow-y-auto border-b border-line bg-surface px-5 py-4 md:w-80 md:border-b-0 md:border-r">
            <p className="label mb-2">Contact Numbers</p>
            <div className="mb-4">
              {contacts.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-400">No numbers on record</p>
              ) : (
                contacts.map((c, i) => (
                  <button
                    key={c.num}
                    onClick={() => setActiveNum(c.num)}
                    className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition ${
                      c.num === activeNum ? "border-info bg-blue-50" : "border-transparent hover:bg-panel"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.08 4.18 2 2 0 016 2h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L10.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.9.58 2.9.71A2 2 0 0122 16.92z" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{c.num}</span>
                      <span className="block text-[11px] text-gray-400">{i + 1}. {c.type}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">LOAN DETAILS</p>
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line">
              {infoCells.map((c, i) => (
                <div key={c.label} className={`border-line px-3 py-2.5 ${i % 2 === 0 ? "border-r" : ""} ${i < infoCells.length - 2 ? "border-b" : ""}`}>
                  <p className="mb-0.5 text-[10px] font-medium text-gray-400">{c.label}</p>
                  <p className={`text-xs font-semibold text-gray-800 ${c.cls}`}>{String(c.val ?? "")}</p>
                </div>
              ))}
            </div>
            <button
              className="mt-2 block w-full text-right text-xs text-info underline"
              onClick={() => window.open("/collection-dashboard?loan_id=" + encodeURIComponent(lead.loanId), "_blank")}
            >
              MORE DETAILS
            </button>

            {/* End call / disposition */}
            <div className="mt-4 border-t border-line pt-3.5">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gray-600">END CALL / DISPOSITION</p>

              <label className="label mb-1 block">Disposition *</label>
              <select
                className="input mb-2.5 w-full"
                value={disposition}
                onChange={(e) => setDisposition(e.target.value)}
              >
                <option value="">Select</option>
                <option value="cb">cb — call_back</option>
              </select>

              <label className="label mb-1 block">Follow-up?</label>
              <label className="mb-2 flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={followupOn}
                  onChange={(e) => setFollowupOn(e.target.checked)}
                  className="accent-accent"
                />
                Schedule a callback
              </label>
              {followupOn && (
                <div className="mb-2.5">
                  <input type="date" className="input mb-1.5 w-full" value={cbDate} onChange={(e) => setCbDate(e.target.value)} />
                  <div className="flex gap-1.5">
                    <input type="number" className="input w-1/2" placeholder="HH" min="0" max="23" value={cbHrs} onChange={(e) => setCbHrs(e.target.value)} />
                    <input type="number" className="input w-1/2" placeholder="MM" min="0" max="59" value={cbMins} onChange={(e) => setCbMins(e.target.value)} />
                  </div>
                </div>
              )}

              <button className="btn-danger w-full justify-center" onClick={endCall} disabled={ending}>
                {ending ? "Closing…" : "END CALL"}
              </button>
            </div>
          </div>

          {/* CENTER — ConVox SSO iframe (same as the PHP $convoxSsoUrl embed) */}
          <div className="relative flex min-h-[300px] min-w-0 flex-1 flex-col bg-panel">
            {ssoLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading ConVox…</div>
            ) : ssoUrl && agentEmail ? (
              <>
                <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-5 py-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-accent-dark">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.08 4.18 2 2 0 016 2h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L10.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.9.58 2.9.71A2 2 0 0122 16.92z" />
                  </svg>
                  <span className="text-xs text-gray-600">Dial and select disposition directly inside ConVox.</span>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <iframe
                    title="ConVox"
                    src={ssoUrl}
                    allow="microphone; autoplay"
                    className="absolute inset-0 h-full w-full border-0 bg-panel"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-9 w-9">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-sm">ConVox widget not available — agent email missing in session.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface px-5 py-3">
          <span className="text-xs text-gray-400">{statusText}</span>
        </div>
      </div>
    </div>
  );
}
