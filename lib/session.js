import { cookies } from "next/headers";
import { getSessionEpoch } from "./sessionEpoch";

const COOKIE_NAME = "crm_session";
const PENDING_COOKIE_NAME = "crm_pending_2fa";

/**
 * Session shape (mirrors PHP $_SESSION):
 * { username, jwt_token, user_id, roles: [], name }
 */
export function getSession() {
  try {
    const raw = cookies().get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!session?.jwt_token) return null;
    // Sessions issued before a "force logout everyone" bump (or before this
    // field existed) carry a stale/absent epoch — treat them as signed out.
    if ((session.epoch ?? 0) !== getSessionEpoch()) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSession(session) {
  const value = Buffer.from(JSON.stringify({ ...session, epoch: getSessionEpoch() }), "utf8").toString("base64");
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h shift
  });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

/**
 * Pending session — holds the session payload for an account that passed
 * the password check but still needs to submit a 2FA code before
 * setSession() is called for real. Short-lived (5 min).
 */
export function setPendingSession(session) {
  const value = Buffer.from(JSON.stringify(session), "utf8").toString("base64");
  cookies().set(PENDING_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5,
  });
}

export function getPendingSession() {
  try {
    const raw = cookies().get(PENDING_COOKIE_NAME)?.value;
    if (!raw) return null;
    const session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!session?.jwt_token || !session?.user_id) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearPendingSession() {
  cookies().set(PENDING_COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export const SESSION_COOKIE = COOKIE_NAME;
