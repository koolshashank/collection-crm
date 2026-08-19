import { getSession } from "@/lib/session";
import { subscribeToNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/stream — ADMIN only. Server-Sent Events: pushes
 * every new security alert (see lib/notifications.js) to the browser the
 * instant it happens, so the admin header bell updates in real time
 * instead of polling. A ": ping" comment keeps the connection alive
 * through idle proxies; the browser's EventSource auto-reconnects if the
 * connection drops.
 */
export async function GET(request) {
  const session = getSession();
  if (!session || !(session.roles ?? []).includes("ADMIN")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (notif) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(notif)}\n\n`));
        } catch {
          /* client already gone — the abort handler below will clean up */
        }
      };

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* ignore — abort handler cleans up */
        }
      }, 25000);

      unsubscribe = subscribeToNotifications(send);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
