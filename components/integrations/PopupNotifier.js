"use client";

/**
 * PopupNotifier — port of popup_notifier.php (drop-in Call PopUp UI).
 *
 * - Polls /api/notifier every 4s ({ popup: object|null }).
 * - When a popup arrives, a card slides in bottom-right with a ring sound
 *   (after the first user interaction, per browser autoplay policy).
 * - "Open Profile" opens the borrower's page; auto-dismiss after 45s.
 * - Desktop notification when the tab is hidden (permission asked once on
 *   first click).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

const POLL_INTERVAL = 4000; // 4 sec
const AUTO_DISMISS = 45000; // 45 sec me card apne aap hat jayega

let cardSeq = 0;

export default function PopupNotifier() {
  const [cards, setCards] = useState([]); // { id, popup, leaving }
  const audioCtxRef = useRef(null);
  const pollingRef = useRef(false);

  /* ── Chhoti ring beep (koi external file nahi chahiye) ── */
  const unlockAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        /* audio unsupported */
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  const playRing = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    try {
      [0, 0.35].forEach((offset) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
        g.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + offset + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.28);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime + offset);
        o.stop(audioCtx.currentTime + offset + 0.3);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback((id) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, leaving: true } : c)));
    setTimeout(() => setCards((cs) => cs.filter((c) => c.id !== id)), 320);
  }, []);

  const showPopup = useCallback(
    (p) => {
      const id = ++cardSeq;
      setCards((cs) => [...cs, { id, popup: p, leaving: false }]);
      playRing();
      setTimeout(() => dismiss(id), AUTO_DISMISS);

      /* Browser tab background me ho to desktop notification */
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const isIn = String(p.type || "incoming").toLowerCase().indexOf("in") === 0;
        try {
          new Notification((isIn ? "Incoming" : "Outgoing") + " Call — " + p.name, {
            body: "+91 " + p.mobile,
          });
        } catch {
          /* ignore */
        }
      }
    },
    [dismiss, playRing]
  );

  useEffect(() => {
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    /* Desktop notification permission (ek baar) */
    const askPermission = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };
    document.addEventListener("click", askPermission, { once: true });

    /* ── Polling loop ── */
    const poll = () => {
      if (pollingRef.current) return; // hidden tab me bhi poll hota rahega
      pollingRef.current = true;
      clientFetch("/api/notifier")
        .then((res) => {
          if (res.ok && res.data && res.data.popup) showPopup(res.data.popup);
        })
        .finally(() => {
          pollingRef.current = false;
        });
    };
    const intervalId = setInterval(poll, POLL_INTERVAL);
    poll();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("click", askPermission);
    };
  }, [showPopup, unlockAudio]);

  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-3">
      {cards.map(({ id, popup: p, leaving }) => {
        const isIn = String(p.type || "incoming").toLowerCase().indexOf("in") === 0;
        return (
          <div
            key={id}
            className={`w-[340px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-line bg-white shadow-pop transition-all duration-300 ${
              leaving ? "translate-x-[120%] opacity-0" : "translate-x-0 opacity-100"
            }`}
            style={{ animation: leaving ? undefined : "cvxSlideIn .35s cubic-bezier(.21,1.02,.55,1) both" }}
          >
            <div
              className={`flex items-center gap-2.5 px-3.5 py-3 text-white ${
                isIn
                  ? "bg-gradient-to-br from-[#1E7E5E] to-[#2aa87e]"
                  : "bg-gradient-to-br from-[#3c64aa] to-[#5b84c9]"
              }`}
            >
              <div className="flex h-[34px] w-[34px] shrink-0 animate-[cvxShake_1.1s_ease-in-out_infinite] items-center justify-center rounded-full bg-white/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-[17px] w-[17px] fill-none stroke-white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold tracking-wide">{isIn ? "Incoming Call" : "Outgoing Call"}</div>
                <div className="text-[11px] opacity-85">{p.process || "CONVOX"}</div>
              </div>
              <button
                type="button"
                title="Dismiss"
                onClick={() => dismiss(id)}
                className="h-6 w-6 shrink-0 rounded-full bg-white/15 text-sm leading-none hover:bg-white/30"
              >
                &times;
              </button>
            </div>
            <div className="p-3.5">
              <div className="mb-0.5 text-base font-bold text-gray-800">{p.name}</div>
              <div className="mb-2.5 text-sm tabular-nums text-gray-500">+91 {p.mobile}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {p.loan_no && (
                  <span className="badge border border-[#c4e8d8] bg-[#e9f7f1] text-[#1E7E5E]">Loan: {p.loan_no}</span>
                )}
                {p.lead_id && (
                  <span className="badge border border-[#d8e5f5] bg-[#eef4fb] text-[#3c64aa]">Lead #{p.lead_id}</span>
                )}
                <span className="badge border border-[#d8e5f5] bg-[#eef4fb] text-[#3c64aa]">
                  Ref: {String(p.ref || "").slice(-8)}
                </span>
              </div>
              <div className="flex gap-2">
                <a
                  href={p.link}
                  className="flex-1 rounded-lg bg-[#1E7E5E] px-2.5 py-2 text-center text-[13px] font-bold text-white transition hover:brightness-110"
                >
                  Open Profile
                </a>
                <button
                  type="button"
                  onClick={() => dismiss(id)}
                  className="flex-1 rounded-lg border border-line bg-gray-100 px-2.5 py-2 text-[13px] font-bold text-gray-500 transition hover:bg-gray-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes cvxSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes cvxShake {
          0%,
          100% {
            transform: rotate(0);
          }
          10% {
            transform: rotate(-14deg);
          }
          20% {
            transform: rotate(11deg);
          }
          30% {
            transform: rotate(-9deg);
          }
          40% {
            transform: rotate(7deg);
          }
          50% {
            transform: rotate(0);
          }
        }
      `}</style>
    </div>
  );
}
