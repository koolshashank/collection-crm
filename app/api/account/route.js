import { NextResponse } from "next/server";
import { rawGet } from "@/lib/serverApi";
import { readZohoTokens } from "../mails/_zoho";

/**
 * GET /api/account
 * Port of get-account.php — reads the access token straight from
 * zoho_tokens.json (no refresh, exactly like the PHP file) and forwards the
 * raw Zoho Mail /api/accounts response.
 */
export async function GET() {
  try {
    const tokens = readZohoTokens();
    const accessToken = tokens?.access_token ?? "";

    const res = await rawGet("https://mail.zoho.in/api/accounts", {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (res.error) {
      return NextResponse.json(
        { success: false, message: "Upstream request failed" },
        { status: 502 }
      );
    }

    // Forward the upstream response verbatim (PHP echoed it raw).
    if (res.data === null || typeof res.data === "string") {
      return new Response(res.data ?? "", {
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.json(res.data);
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
