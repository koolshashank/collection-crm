import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { rawGet } from "@/lib/serverApi";
import {
  zohoIsConnected,
  zohoGetAccessToken,
  getCachedAccountId,
  setCachedAccountId,
} from "./_zoho";

/**
 * GET /api/mails?limit=…&start=…&folder=…
 * Port of get-mails.php — fetches the Zoho Mail inbox and normalises rows.
 * Response: { status:'success', count, data:[…] } or { error, mails:[] }.
 */

/* PHP date('c', ts) — ISO 8601 without milliseconds (UTC offset form) */
function isoC(date) {
  return date.toISOString().slice(0, 19) + "+00:00";
}

export async function GET(request) {
  try {
    /* ── Guard: not connected ── */
    if (!zohoIsConnected()) {
      return NextResponse.json({ error: "not_connected", mails: [] });
    }

    const accessToken = await zohoGetAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "token_failed", mails: [] });
    }

    /* ── STEP 1: Get the user's Zoho Mail account ID (cached) ── */
    let accountId = getCachedAccountId();
    if (!accountId) {
      const accRes = await rawGet("https://mail.zoho.in/api/accounts", {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      const accData =
        accRes.data !== null && typeof accRes.data === "object" ? accRes.data : null;
      accountId = accData?.data?.[0]?.accountId ?? null;
      if (!accountId) {
        return NextResponse.json({ error: "no_account", raw: accData, mails: [] });
      }
      setCachedAccountId(accountId);
    }

    /* ── STEP 2: Fetch inbox messages ── */
    const { searchParams } = new URL(request.url);
    const limit = searchParams.has("limit")
      ? Math.min(parseInt(searchParams.get("limit"), 10) || 0, 200)
      : 50;
    const start = searchParams.has("start")
      ? parseInt(searchParams.get("start"), 10) || 0
      : 0;
    const folder = searchParams.get("folder") ?? "inbox";

    const url =
      `https://mail.zoho.in/api/accounts/${accountId}/messages/view` +
      `?limit=${limit}&start=${start}&folderId=${folder}&sortBy=date&sortOrder=desc`;

    const res = await rawGet(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    if (res.error) {
      return NextResponse.json({ error: res.error, mails: [] });
    }

    const response = res.data !== null && typeof res.data === "object" ? res.data : {};
    const rawMails = Array.isArray(response.data) ? response.data : [];
    const mails = [];

    /* ── STEP 3: Normalise into the shape the mail page expects ── */
    for (const m of rawMails) {
      let fromName = m.fromAddress ?? m.sender ?? "Unknown";
      let fromEmail = m.fromAddress ?? "";

      // Zoho returns "Display Name <email@domain.com>" — split it
      const matches = /^(.*?)\s*<(.+?)>$/.exec(String(fromName));
      if (matches) {
        fromName = matches[1].trim() || matches[2];
        fromEmail = matches[2].trim();
      }

      mails.push({
        zohoMessageId: m.messageId ?? "",
        from: fromName,
        fromEmail: fromEmail,
        to: m.toAddress ?? "",
        subject: m.subject ?? "(No Subject)",
        summary: m.summary ?? "",
        body: m.summary ?? "", // full body via /api/mails/body
        date:
          m.receivedTime !== undefined && m.receivedTime !== null
            ? isoC(new Date(Math.trunc(Number(m.receivedTime) / 1000) * 1000)) // Zoho ms → seconds
            : isoC(new Date()),
        read: Boolean(m.isRead ?? false),
        attachment: m.hasAttachment ? { name: "Attachment" } : null,
        priority: (m.priority ?? "") === "high",
      });
    }

    return NextResponse.json({ status: "success", count: mails.length, data: mails });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
