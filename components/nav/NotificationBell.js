"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

function fmtTs(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Header bell — real-time security alerts (see lib/notifications.js).
 * Loads recent alerts once, then keeps a live SSE connection open
 * (/api/notifications/stream) so a new alert shows up the instant a
 * non-admin copies/prints/screenshots customer data, without polling.
 * ADMIN-only — AppShell only mounts this for admins.
 */
export default function NotificationBell() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await clientFetch("/api/notifications/list");
      if (!cancelled && res.ok && res.data?.success) {
        setItems(res.data.notifications ?? []);
        setUnread(res.data.unread ?? 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (e) => {
      let notif;
      try {
        notif = JSON.parse(e.data);
      } catch {
        return;
      }
      setItems((prev) => [notif, ...prev].slice(0, 50));
      setUnread((n) => n + 1);
      toast.error(notif.message, 8000);
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      await postJson("/api/notifications/read", { all: true });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={togglePanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10"
        aria-label="Security alerts"
        title="Security alerts"
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[300] w-80 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            Security Alerts
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">No alerts yet.</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b border-line px-4 py-2.5 last:border-0 hover:bg-accent-light/20">
                  <div className="text-xs text-gray-700">{n.message}</div>
                  <div className="mt-0.5 text-[10px] text-gray-400">{fmtTs(n.ts)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
