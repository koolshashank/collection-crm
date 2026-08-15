import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  closeOpenBreaks,
  closeSession,
  findOpenSessionForDay,
  getActiveBreak,
  getSessionById,
  insertBreak,
  insertSession,
  sumClosedBreakSec,
  touchSession,
  trackerNow,
  trackerToday,
} from "@/lib/trackerDb";

export const dynamic = "force-dynamic";

/**
 * POST /api/tracking/ping — port of tracking_ping.php.
 * Called by JS every 60s to record activity heartbeat.
 * Also handles: start session, mark break, end break, logout event.
 *
 * Actions: ping | start | break_start | break_end | logout | auto_logout | status
 *
 * STORAGE SWAP: SQLite (data/tracker.sqlite) → append-only JSONL at
 * PROJECT_ROOT/data/tracker.jsonl (see lib/trackerDb.js). Same fields,
 * same query behaviour. PHP kept the active session id in
 * $_SESSION['tracker_session_id']; here it lives in the httpOnly
 * cookie `tracker_session_id`.
 *
 * This route must NEVER 500 — tracker failures are swallowed and the
 * response is always 200 JSON, exactly like the PHP (which echoed
 * {'success':false,...} with a 200 status on every failure path).
 */

const SID_COOKIE = "tracker_session_id";

function json(payload, sid) {
  const res = NextResponse.json(payload);
  if (sid !== undefined) {
    res.cookies.set(SID_COOKIE, String(sid), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // matches the 12h crm_session shift
    });
  }
  return res;
}

export async function POST(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "not_authenticated" });
    }

    const userId = session.user_id ?? 0;
    const userName = session.name ?? "Unknown";
    const roles = session.roles ?? [];
    const roleLabel = roles.length ? roles[0] : "STAFF";

    let body = {};
    try {
      body = (await request.json()) || {};
    } catch {
      body = {}; // PHP: json_decode failure → [] → action defaults to 'ping'
    }
    const action = body.action ?? "ping";

    const now = trackerNow();
    const today = trackerToday();
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const ua = (request.headers.get("user-agent") || "").slice(0, 200);

    const cookieSid = parseInt(request.cookies.get(SID_COOKIE)?.value || "0", 10) || 0;

    switch (action) {
      case "start": {
        /* Called once on login / first page load.
           Check if open session already exists for today. */
        const existing = findOpenSessionForDay(userId, today);
        let sessionId;
        if (!existing) {
          sessionId = insertSession({
            user_id: userId,
            user_name: userName,
            role: roleLabel,
            login_time: now,
            last_ping: now,
            ip,
            user_agent: ua,
          });
        } else {
          sessionId = existing;
          /* Update last_ping */
          touchSession(sessionId, now);
        }
        return json({ success: true, session_id: sessionId }, sessionId);
      }

      case "ping": {
        /* Heartbeat every 60s */
        if (cookieSid) touchSession(cookieSid, now);
        return json({ success: true });
      }

      case "break_start": {
        const type = body.break_type ?? "break";
        if (!cookieSid) return json({ success: false, message: "no_session" });
        /* Close any unclosed break first */
        closeOpenBreaks(cookieSid, now);
        const breakId = insertBreak(cookieSid, type, now);
        return json({ success: true, break_id: breakId, break_type: type });
      }

      case "break_end": {
        if (!cookieSid) return json({ success: false, message: "no_session" });
        closeOpenBreaks(cookieSid, now);
        return json({ success: true });
      }

      case "logout":
      case "auto_logout": {
        const duration = parseInt(body.duration_seconds ?? 0, 10) || 0;
        const inactive = parseInt(body.inactive_seconds ?? 0, 10) || 0;
        const logType = action === "auto_logout" ? "auto" : "manual";
        if (cookieSid) {
          /* Close any open breaks */
          closeOpenBreaks(cookieSid, now);
          /* Close session */
          closeSession(cookieSid, {
            logout_time: now,
            duration_sec: duration,
            inactive_sec: inactive,
            logout_type: logType,
          });
        }
        return json({ success: true });
      }

      case "status": {
        /* Called on every page load so the header widget can restore
           the running timer + any active break after a refresh/navigation,
           without relying on client-side storage. */
        if (!cookieSid) return json({ success: false, message: "no_session" });

        const trackedSession = getSessionById(cookieSid);
        if (!trackedSession) return json({ success: false, message: "session_not_found" });

        const activeBreak = getActiveBreak(cookieSid);

        /* Sum of all closed breaks today for this session (client adds the
           live/open one itself since that's still ticking). */
        const closedBreakSec = sumClosedBreakSec(cookieSid);

        return json({
          success: true,
          login_time: trackedSession.login_time,
          server_time: now,
          on_break: Boolean(activeBreak),
          break_type: activeBreak?.break_type ?? null,
          break_since: activeBreak?.start_time ?? null,
          closed_break_sec: closedBreakSec,
        });
      }

      default:
        return json({ success: false, message: "unknown_action" });
    }
  } catch (err) {
    /* Never 500 — mirrors the PHP db_error soft-fail */
    return NextResponse.json({ success: false, message: "db_error" });
  }
}
