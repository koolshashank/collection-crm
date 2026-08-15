import { NextResponse } from "next/server";
import { getPendingSession } from "@/lib/session";
import { getUserRecord, setUserRecord } from "@/lib/twoFactorStore";
import { generateSecret, keyUri, toQrDataUrl } from "@/lib/twoFactor";

/**
 * /api/auth/setup-2fa — first-time enrollment during a forced login.
 * Only reachable via the pending-session cookie (post-password, pre-2FA).
 * Generates a secret on first call; repeat calls (e.g. page refresh)
 * return the same secret/QR rather than invalidating an in-progress scan.
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

  let record = getUserRecord(pending.user_id);
  if (!record?.secret) {
    const secret = generateSecret();
    record = setUserRecord(pending.user_id, { secret, username: pending.username });
  }

  const uri = keyUri(record.secret, pending.username);
  const qrCodeDataUrl = await toQrDataUrl(uri);

  return NextResponse.json({ success: true, secret: record.secret, qrCodeDataUrl });
}
