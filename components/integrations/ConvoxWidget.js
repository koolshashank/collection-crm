"use client";

/**
 * ConvoxWidget — port of convox_widget.php (floating ConVox phone widget)
 * plus the ConVox Call PopUp poller from header.php.
 *
 * - Bottom-LEFT floating phone button (popup notifier is bottom-RIGHT).
 * - Click → panel opens with the ConVox SSO iframe; the agent is
 *   auto-logged-in (SSO URL comes from /api/convox/sso — secrets stay
 *   server-side). Iframe src is lazy-set on first open.
 * - "Detach" opens the widget in a small separate window — USE THIS DURING
 *   CALLS, page navigation in panel mode reloads the iframe and can drop
 *   the call.
 * - Panel open/close state remembered in localStorage (cvxw_open).
 * - Background poll of /api/convox/check-active-call?since=… every 4s to
 *   auto-open the customer's page on a new call event (header.php logic).
 */

import { useEffect, useRef, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

const WIN_NAME = "convox_phone_widget";
const POPUP_POLL_MS = 4000; // check every 4 seconds

export default function ConvoxWidget() {
  const [widgetUrl, setWidgetUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const [frameSrc, setFrameSrc] = useState(null); // lazy — only set on first open
  const loadedRef = useRef(false);

  /* Fetch the SSO widget URL once — if it fails, silently skip the widget
     (same as the PHP returning early when config is wrong) */
  useEffect(() => {
    let cancelled = false;
    clientFetch("/api/convox/sso").then((res) => {
      if (cancelled) return;
      if (res.ok && res.data?.success && res.data?.url) {
        setWidgetUrl(res.data.url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Restore panel state after the URL is known */
  useEffect(() => {
    if (!widgetUrl) return;
    try {
      if (localStorage.getItem("cvxw_open") === "1") openPanelWith(widgetUrl);
    } catch {
      /* localStorage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetUrl]);

  /* ── ConVox Call PopUp poller (from header.php) ── */
  useEffect(() => {
    let lastSeen = 0;
    try {
      lastSeen = parseInt(localStorage.getItem("convox_popup_last_seen") || "0", 10) || 0;
    } catch {
      /* ignore */
    }

    let intervalId = null;

    const checkPopup = async () => {
      const res = await clientFetch("/api/convox/check-active-call?since=" + lastSeen);
      if (res.status === 0) return; // silent — network hiccup, try again next tick
      const data = res.data;
      if (!data || !data.success) {
        /* Unrecoverable condition (e.g. no ConVox mapping for this user) —
           stop polling entirely instead of retrying forever */
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }
      if (data.has_new && data.event) {
        lastSeen = data.event.received_at;
        try {
          localStorage.setItem("convox_popup_last_seen", String(lastSeen));
        } catch {
          /* ignore */
        }
        /* Simplest reliable behaviour: open the customer's details page in a
           new tab so the agent sees it immediately (same as header.php) */
        if (data.event.lead_id) {
          window.open("/client-info?lead_id=" + encodeURIComponent(data.event.lead_id), "_blank");
        }
      }
    };

    intervalId = setInterval(checkPopup, POPUP_POLL_MS);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const openPanelWith = (url) => {
    if (!loadedRef.current) {
      setFrameSrc(url);
      loadedRef.current = true;
    }
    setOpen(true);
    try {
      localStorage.setItem("cvxw_open", "1");
    } catch {
      /* ignore */
    }
  };

  const closePanel = () => {
    setOpen(false);
    try {
      localStorage.setItem("cvxw_open", "0");
    } catch {
      /* ignore */
    }
  };

  const togglePanel = () => {
    if (open) closePanel();
    else if (widgetUrl) openPanelWith(widgetUrl);
  };

  /* Detach: widget in its own small window — CRM navigation won't drop the
     call. Panel iframe is blanked to avoid double-registration. */
  const detach = () => {
    if (!widgetUrl) return;
    const w = window.open(
      widgetUrl,
      WIN_NAME,
      "width=380,height=640,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
    );
    if (w) {
      setFrameSrc("about:blank"); // panel wala session band
      loadedRef.current = false;
      closePanel();
      w.focus();
    } else {
      alert("Popup blocker ne window rok di — is site ke liye popups allow kar do.");
    }
  };

  if (!widgetUrl) return null; // config galat hai to chup-chaap skip

  return (
    <>
      {/* Launcher button */}
      <button
        type="button"
        title="ConVox Phone"
        onClick={togglePanel}
        className="fixed bottom-5 left-5 z-[997] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-navy to-[#3c64aa] shadow-pop transition-transform hover:scale-105"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px] fill-none stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
        <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      </button>

      {/* Widget panel */}
      <div
        className={`fixed bottom-[84px] left-5 z-[998] h-[560px] max-h-[calc(100vh-120px)] w-[340px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop ${
          open ? "flex" : "hidden"
        }`}
      >
        <div className="flex shrink-0 items-center gap-2 bg-gradient-to-br from-navy to-[#3c64aa] px-3 py-2.5 text-white">
          <span className="flex-1 text-[13px] font-bold tracking-wide">ConVox Phone</span>
          <button
            type="button"
            title="Alag window me kholo (call safe rahegi)"
            onClick={detach}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-white/15 transition hover:bg-white/30"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            title="Minimize"
            onClick={closePanel}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-white/15 transition hover:bg-white/30"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Widget iframe — src lazy set hota hai (pehli baar kholne pe) */}
        <iframe
          src={frameSrc || undefined}
          allow="microphone; autoplay; camera"
          title="ConVox Phone Widget"
          className="w-full flex-1 border-none bg-surface"
        />

        <div className="shrink-0 border-t border-line bg-gray-50 px-3 py-1.5 text-[11px] leading-relaxed text-gray-500">
          <b className="text-[#3c64aa]">Tip:</b> Call ke dauran page change karna ho to pehle{" "}
          <b className="text-[#3c64aa]">detach</b> (↗) dabao — widget alag window me chala jayega aur call nahi
          katgegi.
        </div>
      </div>
    </>
  );
}
