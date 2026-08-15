"use client";

import { useEffect, useRef, useState } from "react";
import { CiIcon } from "./icons";

/* Keypad layout — verbatim from the PHP page */
const KEYS = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

/**
 * Manual Call pane — port of the lpDialer* functions (keypad, mute,
 * clear, tel: call, timer, end-call bar).
 */
export default function ManualDialerPane({ initialNumber, micOk, onRequestMic, onCallEnded, onStatus, toast }) {
  const [number, setNumber] = useState(initialNumber || "");
  const [muted, setMuted] = useState(false);
  const [calling, setCalling] = useState(false);
  const [sec, setSec] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function key(k) {
    if (calling) return;
    setNumber((n) => (n.length >= 15 ? n : n + k));
  }

  function toggleMute() {
    setMuted((m) => {
      toast(!m ? "Muted" : "Unmuted", true);
      return !m;
    });
  }

  function startCall() {
    const num = number.trim();
    if (!num || num.length < 6) {
      toast("Enter a valid number", false);
      return;
    }
    if (!micOk) {
      onRequestMic();
      return;
    }
    setCalling(true);
    setSec(0);
    timerRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    /* tel: link */
    try {
      const a = document.createElement("a");
      a.href = "tel:" + num;
      a.click();
    } catch {}
    onStatus("Calling " + num + "");
  }

  function endCall() {
    clearInterval(timerRef.current);
    setCalling(false);
    onCallEnded(sec, number.trim());
    onStatus("Call ended  switch to Dialer tab to submit disposition");
    toast("Call ended  " + sec + "s", true);
  }

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-7">
      <div className="w-full max-w-[340px]">
        {/* Display screen */}
        <div className="relative mb-4 rounded-2xl bg-[#1a1a2e] px-5 pb-3.5 pt-4">
          <div className="mb-1 text-[11px] uppercase tracking-widest text-gray-400">Enter Number</div>
          <div className="min-h-[42px] break-all pr-9 text-[1.65rem] font-semibold tracking-[.12em] text-white">
            {number || " "}
          </div>
          <button
            onClick={() => setNumber((n) => n.slice(0, -1))}
            className="absolute bottom-4 right-4 p-1 text-gray-400 transition hover:text-white"
            aria-label="Backspace"
          >
            <CiIcon name="backspace" size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Keypad */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {KEYS.map(([k, letters]) => (
            <button
              key={k}
              onClick={() => key(k)}
              className="rounded-xl border border-[#e5e7eb] bg-[#f8f9fc] px-2 py-3.5 text-center transition hover:border-info hover:bg-[#e8f4fd] active:scale-95"
            >
              <div className="text-lg font-bold leading-none text-[#1a1a2e]">{k}</div>
              {letters ? <div className="mt-0.5 text-[9px] tracking-widest text-gray-400">{letters}</div> : null}
            </button>
          ))}
        </div>

        {/* Mute / Call / Clear row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <button
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border transition ${
              muted ? "border-[#fecaca] bg-[#fef2f2] text-[#ef4444]" : "border-[#bae6fd] bg-[#f0f9ff] text-[#0ea5e9]"
            }`}
          >
            <CiIcon name="mic" size={18} strokeWidth={2} />
          </button>

          <button
            onClick={calling ? endCall : startCall}
            className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-white shadow-lg transition ${
              calling ? "bg-[#ef4444]" : "bg-[#1E7E5E] shadow-[#1E7E5E]/40 hover:bg-[#165f47]"
            }`}
            aria-label={calling ? "End call" : "Call"}
          >
            <CiIcon name={calling ? "phoneOff" : "phone"} size={26} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => !calling && setNumber("")}
            title="Clear"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#fecaca] bg-[#fef2f2] text-[#ef4444] transition hover:bg-[#fee2e2]"
          >
            <CiIcon name="trash" size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Active call bar */}
        {calling && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#1a1a2e] px-4 py-3.5">
            <div>
              <div className="text-xs text-gray-400">Calling</div>
              <div className="text-[15px] font-semibold text-white">{number.trim()}</div>
              <div className="font-mono text-[13px] text-[#4ade80]">
                {mm}:{ss}
              </div>
            </div>
            <button
              onClick={endCall}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-white"
              aria-label="End call"
            >
              <CiIcon name="phoneOff" size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
