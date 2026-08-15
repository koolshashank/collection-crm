import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { rawGet } from "@/lib/serverApi";
import { zohoIsConnected, zohoGetAccessToken, getCachedAccountId } from "../_zoho";

/**
 * GET /api/mails/body?messageId=…
 * Port of get_mail_body.php — fetches the full body of a single Zoho message.
 * Response: { status:'success', body:<plain text>, html:<raw html> } or { error }.
 */

/* Minimal html_entity_decode for the common entities */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return _;
      }
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function GET(request) {
  try {
    if (!zohoIsConnected()) {
      return NextResponse.json({ error: "not_connected" });
    }

    const messageId = new URL(request.url).searchParams.get("messageId") || "";
    if (!messageId) {
      return NextResponse.json({ error: "no_message_id" });
    }

    const accountId = getCachedAccountId();
    if (!accountId) {
      return NextResponse.json({
        error: "no_account_id — load inbox first via get-mails.php",
      });
    }

    const accessToken = await zohoGetAccessToken();

    const res = await rawGet(
      `https://mail.zoho.in/api/accounts/${accountId}/messages/${messageId}/content`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const data = res.data !== null && typeof res.data === "object" ? res.data : {};
    const body = data?.data?.content ?? data?.data?.htmlContent ?? "";

    /* Strip HTML → clean plain text (same steps as PHP) */
    let plain = String(body)
      .replace(/<br>/g, "\n")
      .replace(/<br\/>/g, "\n")
      .replace(/<br \/>/g, "\n")
      .replace(/<\/p>/g, "\n")
      .replace(/<\/div>/g, "\n")
      .replace(/<[^>]*>/g, ""); // strip_tags
    plain = decodeEntities(plain);
    plain = plain.replace(/\n{3,}/g, "\n\n").trim();

    return NextResponse.json({ status: "success", body: plain, html: body });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
