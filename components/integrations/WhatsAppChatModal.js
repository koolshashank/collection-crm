"use client";

/**
 * WhatsAppChatModal — port of whatsapp_chat_modal.php (WhatsApp-style chat).
 *
 * Props: { open, onClose, mobile, name, onOpenTemplate? }
 *  - mobile/name: customer info (same as wacOpen(mobile, name))
 *  - onOpenTemplate: optional callback to open a template modal owned by the
 *    parent; when omitted, the built-in WhatsAppTemplateModal is used.
 *
 * Behaviour is identical to the PHP: conversation fetched from
 * /api/whatsapp/conversation and refreshed by fast polling every 4s.
 * (SSE was intentionally disabled in the PHP for robustness — polling
 * completes quickly and never holds a connection open. The SSE proxy still
 * exists at /api/whatsapp/events-stream if live push is ever re-enabled.)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import WhatsAppTemplateModal from "./WhatsAppTemplateModal";

const POLL_MS = 4000;

/* Builds the display text for a message based on its type — Dootiq
   messages can be plain text, a template send, or media (wacMessageText) */
function messageText(m) {
  if (m.type === "template" && m.template) {
    return "📄 Template: " + (m.template.name || "unknown");
  }
  if (m.type === "media" && m.media) {
    return (m.media.caption ? m.media.caption + "\n" : "") + "📎 " + (m.media.mimeType || "Media attachment");
  }
  return m.text || "";
}

function Tick({ status }) {
  if (status === "read") {
    return (
      <svg className="h-3.5 w-3.5 text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor" aria-hidden="true">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.512zM11.01 3.316l-.478-.372a.365.365 0 00-.51.063L4.666 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.063-.512z" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 16 15" fill="currentColor" aria-hidden="true">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.512zM11.01 3.316l-.478-.372a.365.365 0 00-.51.063L4.666 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.063-.512z" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 16 15" fill="currentColor" aria-hidden="true">
      <path d="M10.91 3.316l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.791 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.063-.512z" />
    </svg>
  );
}

const TEMPLATE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CHAT_EMPTY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2.5 block h-11 w-11 text-[#b8c4c9]" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

export default function WhatsAppChatModal({ open, onClose, mobile = "", name = "", onOpenTemplate }) {
  const toast = useToast();

  const [messages, setMessages] = useState(null); // null = loading
  const [pending, setPending] = useState([]); // optimistic bubbles {id, content, state:'sending'|'sent'}
  const [windowNotice, setWindowNotice] = useState(false);
  const [input, setInput] = useState("");
  const [sendDisabled, setSendDisabled] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const bodyRef = useRef(null);
  const lastCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const body = bodyRef.current;
    if (body) setTimeout(() => (body.scrollTop = body.scrollHeight), 50);
  }, []);

  const fetchMessages = useCallback(
    async (forceScroll) => {
      if (!mobile) return;
      const res = await clientFetch("/api/whatsapp/conversation?phone=" + encodeURIComponent(mobile));
      if (!res.ok || !res.data?.success) return;
      const msgs = res.data.messages || [];
      if (msgs.length === lastCountRef.current && !forceScroll) return; // nothing new
      lastCountRef.current = msgs.length;

      const body = bodyRef.current;
      const wasAtBottom = body ? body.scrollTop + body.clientHeight >= body.scrollHeight - 40 : true;

      setMessages(msgs);
      setPending([]); // server list has caught up — drop optimistic bubbles
      if (forceScroll || wasAtBottom) scrollToBottom();
    },
    [mobile, scrollToBottom]
  );

  /* Open: reset + initial fetch + fast polling (SSE intentionally disabled,
     same as the PHP — see file header) */
  useEffect(() => {
    if (!open) return;
    setMessages(null);
    setPending([]);
    setWindowNotice(false); // reset — only shown on an actual send failure
    setInput("");
    lastCountRef.current = 0;

    fetchMessages(true);
    pollTimerRef.current = setInterval(() => fetchMessages(false), POLL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [open, fetchMessages]);

  const openTemplate = () => {
    if (typeof onOpenTemplate === "function") {
      onOpenTemplate({ name, mobile });
    } else {
      setTemplateOpen(true);
    }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sendDisabled) return;

    setSendDisabled(true);
    setInput("");

    /* Optimistic UI: show it immediately as "sending" */
    const tempId = "wac-temp-" + Date.now();
    setPending((p) => [...p, { id: tempId, content, state: "sending" }]);
    scrollToBottom();

    const res = await postJson("/api/whatsapp/send-freeform", { phone: mobile, content });
    setSendDisabled(false);

    const data = res.data || {};
    if (data.success) {
      setWindowNotice(false);
      /* Update the optimistic bubble in place — instant feedback */
      setPending((p) => p.map((b) => (b.id === tempId ? { ...b, state: "sent" } : b)));
      lastCountRef.current += 1; // account for this message so the next sync doesn't re-render unnecessarily
      /* Reconcile with the server in the background */
      setTimeout(() => fetchMessages(false), 1500);
    } else if (data.code === "OUTSIDE_SESSION_WINDOW") {
      setPending((p) => p.filter((b) => b.id !== tempId));
      setWindowNotice(true);
      toast.error("Outside 24h window — please send a Template instead.");
      openTemplate();
    } else {
      setPending((p) => p.filter((b) => b.id !== tempId));
      toast.error(data.message || (res.status === 0 ? "Network error — please try again" : "Failed to send"));
    }
  };

  /* Group messages by day label, same as wacRenderMessages */
  const rows = [];
  let lastDate = null;
  (messages || []).forEach((m, i) => {
    const dirClass = m.direction === "inbound" ? "in" : "out";
    const d = new Date(m.timestamp);
    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (dateStr !== lastDate) {
      rows.push({ kind: "day", key: "day-" + i, label: dateStr });
      lastDate = dateStr;
    }
    const timeStr = d
      .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      .toLowerCase();
    rows.push({ kind: "msg", key: "m-" + i, dir: dirClass, text: messageText(m), time: timeStr, status: m.status });
  });

  const avatarLetter = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="sm"
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#128C7E] font-display text-sm font-bold text-white">
              {avatarLetter}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name || mobile}</span>
              <span className="block text-xs font-normal text-gray-400">{mobile}</span>
            </span>
            <button
              type="button"
              onClick={openTemplate}
              title="Send template"
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              {TEMPLATE_ICON}
            </button>
          </span>
        }
      >
        <div className="-mx-5 -my-4 flex h-[62vh] max-h-[560px] flex-col overflow-hidden rounded-b-none">
          {/* Chat body — WhatsApp beige */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto bg-[#e5ddd5] px-3 py-3.5">
            {messages === null ? (
              <div className="px-5 py-16 text-center text-xs text-[#7a8b93]">
                {CHAT_EMPTY_ICON}
                Loading conversation…
              </div>
            ) : rows.length === 0 && pending.length === 0 ? (
              <div className="px-5 py-16 text-center text-xs text-[#7a8b93]">
                {CHAT_EMPTY_ICON}
                No messages yet — say hello!
              </div>
            ) : (
              <>
                {rows.map((r) =>
                  r.kind === "day" ? (
                    <div key={r.key} className="my-2.5 text-center">
                      <span className="rounded-lg bg-[#e1f2fb] px-3 py-1 text-[11px] font-semibold text-[#54656f] shadow-sm">
                        {r.label}
                      </span>
                    </div>
                  ) : (
                    <div key={r.key} className={`mb-1.5 flex ${r.dir === "out" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 text-sm leading-snug text-[#111b21] shadow-sm ${
                          r.dir === "out" ? "rounded-tr-sm bg-[#dcf8c6]" : "rounded-tl-sm bg-white"
                        }`}
                      >
                        {r.text}
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#111b21]/50">
                          {r.time} {r.dir === "out" && <Tick status={r.status} />}
                        </div>
                      </div>
                    </div>
                  )
                )}
                {pending.map((b) => (
                  <div key={b.id} className="mb-1.5 flex justify-end">
                    <div className="max-w-[78%] whitespace-pre-wrap break-words rounded-lg rounded-tr-sm bg-[#dcf8c6] px-2.5 py-1.5 text-sm leading-snug text-[#111b21] shadow-sm">
                      {b.content}
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#111b21]/50">
                        {b.state === "sending" ? (
                          "sending…"
                        ) : (
                          <>
                            {new Date()
                              .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                              .toLowerCase()}{" "}
                            <Tick status="sent" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Outside-24h window notice */}
          {windowNotice && (
            <div className="border-t border-[#f0e0b0] bg-[#fef3dc] px-4 py-2 text-center text-xs text-[#8a6d3b]">
              This conversation is outside the 24h window — send an approved Template to reach the customer.
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-end gap-2 bg-[#f0f0f0] px-2.5 py-2">
            <button
              type="button"
              onClick={openTemplate}
              title="Send a template instead"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#54656f] shadow transition hover:bg-gray-100"
            >
              {TEMPLATE_ICON}
            </button>
            <div className="flex flex-1 items-center rounded-3xl bg-white px-3.5 py-2">
              <textarea
                rows={1}
                placeholder="Type a message"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="max-h-20 flex-1 resize-none border-none bg-transparent text-sm leading-snug text-[#111b21] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={sendMessage}
              disabled={sendDisabled}
              title="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:bg-[#b8c4c9]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </Modal>

      {/* Built-in template modal (used when no onOpenTemplate is provided) */}
      {typeof onOpenTemplate !== "function" && (
        <WhatsAppTemplateModal
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
          name={name}
          mobile={mobile}
        />
      )}
    </>
  );
}
