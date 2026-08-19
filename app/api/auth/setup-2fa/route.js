import { NextResponse } from "next/server";
import { getPendingSession, setPendingSession } from "@/lib/session";
import { getUserRecord } from "@/lib/twoFactorStore";
import { generateSecret, keyUri, toQrDataUrl } from "@/lib/twoFactor";

/**
 * /api/auth/setup-2fa — first-time enrollment during a forced login.
 * Only reachable via the pending-session cookie (post-password, pre-2FA).
 *
 * The generated secret lives on the pending-session cookie ONLY — it is not
 * written to the permanent per-user store (lib/twoFactorStore.js) until
 * verify-2fa confirms the user actually scanned it and typed a valid code.
 * That way, someone who abandons setup (closes the tab, never confirms)
 * sees the QR again on their next login attempt instead of being silently
 * "enrolled" with a secret they never saved anywhere.
 *
 * Repeat calls (e.g. page refresh) return the same secret/QR rather than
 * invalidating an in-progress scan.
 * POST → { success: true, qrCodeDataUrl, secret }
 */
export async function POST() {
  const pending = getPendingSession();
  if (!pending) {
    return NextResponse.json(
      { success: false, message: "Your session has expired. Please log in again." },
      { status: 400 }
    );
  }

  const existing = getUserRecord(pending.user_id);
  let secret = existing?.secret ?? pending.pendingSecret;
  if (!secret) {
    secret = generateSecret();
    setPendingSession({ ...pending, pendingSecret: secret });
  }

  const uri = keyUri(secret, pending.username);
  const qrCodeDataUrl = await toQrDataUrl(uri);

  return NextResponse.json({ success: true, secret, qrCodeDataUrl });
}
