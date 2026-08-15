/**
 * GET /api/whatsapp/events-stream?events=... — port of dootiq_events_stream_proxy.php.
 *
 * The browser's native EventSource can't send custom headers, but Dootiq's
 * /events/stream requires Authorization: Bearer <token>. This proxy holds
 * the real token server-side, opens the authenticated connection to Dootiq,
 * and re-streams whatever it sends straight through to the browser's
 * EventSource — same-origin, session cookie handles auth on that side.
 *
 * Like the PHP version: bounded ~20s upstream attempts in a loop (so we can
 * detect client disconnects even when Dootiq is quiet), keep-alive comments
 * between attempts, and a hard 20-minute max session (EventSource
 * auto-reconnects with a fresh request, so nothing is lost).
 */

import { getSession } from "@/lib/session";
import { dootiqGetAccessToken, DOOTIQ_BASE_URL } from "@/lib/whatsapp/dootiq";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return new Response(null, { status: 401 });
  }

  const events = request.nextUrl.searchParams.get("events") || "message.received,message.delivered";
  const url = DOOTIQ_BASE_URL + "/events/stream?" + new URLSearchParams({ events }).toString();

  const streamStartedAt = Date.now();
  let clientGone = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk) => {
        if (clientGone) return false;
        try {
          controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
          return true;
        } catch {
          clientGone = true;
          return false;
        }
      };
      const close = () => {
        if (!clientGone) {
          clientGone = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      };

      request.signal?.addEventListener("abort", () => {
        clientGone = true;
      });

      /* Send a small padding comment immediately — some proxies/browsers
         need the first chunk to be a minimum size before rendering */
      send(": " + " ".repeat(2048) + "\n\n");

      const accessToken = await dootiqGetAccessToken();
      if (!accessToken) {
        send('event: error\ndata: {"message":"Could not obtain Dootiq access token"}\n\n');
        close();
        return;
      }

      while (!clientGone && !request.signal?.aborted) {
        /* Hard safety valve: force the stream to end after 20 minutes —
           EventSource will auto-reconnect with a fresh request. */
        if (Date.now() - streamStartedAt > 1200 * 1000) {
          send(": max session duration reached, reconnecting\n\n");
          break;
        }

        /* Bounded per-attempt timeout (~20s) so control returns here
           periodically, letting us notice client disconnects cleanly. */
        const upstreamController = new AbortController();
        const attemptTimer = setTimeout(() => upstreamController.abort(), 20000);
        const onClientAbort = () => upstreamController.abort();
        request.signal?.addEventListener("abort", onClientAbort);

        try {
          const upstream = await fetch(url, {
            headers: {
              Authorization: "Bearer " + accessToken,
              Accept: "text/event-stream",
            },
            signal: upstreamController.signal,
            cache: "no-store",
          });

          if (upstream.body) {
            const reader = upstream.body.getReader();
            // Re-stream Dootiq's bytes straight through
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!send(value)) {
                try {
                  await reader.cancel();
                } catch {
                  /* ignore */
                }
                break;
              }
            }
          }
        } catch {
          /* timeout / network hiccup / client abort — loop decides below */
        } finally {
          clearTimeout(attemptTimer);
          request.signal?.removeEventListener("abort", onClientAbort);
        }

        if (clientGone || request.signal?.aborted) break;

        /* Keep-alive comment so the browser's EventSource knows we're
           still alive, then briefly pause before reconnecting */
        send(": keep-alive\n\n");
        await new Promise((r) => setTimeout(r, 200)); // 200ms
      }

      close();
    },
    cancel() {
      clientGone = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disables buffering on nginx if used
    },
  });
}
