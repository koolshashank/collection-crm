import { NextResponse } from "next/server";
import { recordNocTrackEvent } from "@/lib/trackerDb";

export const dynamic = "force-dynamic";

/**
 * /api/noc/track — PUBLIC (no auth; whitelisted in middleware PUBLIC_API).
 *
 * NOC link / pixel tracker. Companion of includes/noc_link_recorder.php:
 * the recorder stores which NOC link was sent to which customer
 * (storage/noc_links.jsonl, written by /api/noc/email); this endpoint
 * records when that customer actually OPENS the email (tracking pixel)
 * or CLICKS the NOC link.
 *
 *   GET /api/noc/track?loan_no=…&lead_id=…&event=open           → 1x1 GIF pixel
 *   GET /api/noc/track?loan_no=…&event=click&url=<https://…>    → 302 redirect to url
 *   POST /api/noc/track  {loan_no, lead_id, event, url, sent_to} → {"success":true}
 *
 * Recorded fields (same identifiers the PHP recorder + tracker store used):
 * loan_no, lead_id, event, url (s3_url), sent_to, ip, user_agent, created_at —
 * appended to PROJECT_ROOT/data/tracker.jsonl (SQLite→JSONL swap documented
 * in lib/trackerDb.js).
 *
 * HARD RULE: this route must NEVER 500 — every failure is swallowed and the
 * customer-facing response (pixel/redirect) is always served with 200/302.
 */

const GIF_1PX = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function record(params, request) {
  try {
    recordNocTrackEvent({
      loan_no: params.get("loan_no") || "",
      lead_id: params.get("lead_id") || "",
      event: params.get("event") || (params.get("url") ? "click" : "open"),
      url: params.get("url") || params.get("s3_url") || "",
      sent_to: params.get("sent_to") || params.get("email") || "",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      user_agent: (request.headers.get("user-agent") || "").slice(0, 200),
    });
  } catch {
    /* tracker failures are swallowed — never break the pixel/redirect */
  }
}

export async function GET(request) {
  let redirectTo = null;
  try {
    const { searchParams } = new URL(request.url);
    record(searchParams, request);
    const url = searchParams.get("url") || "";
    if (/^https?:\/\//i.test(url)) redirectTo = url;
  } catch {
    /* swallow */
  }

  try {
    if (redirectTo) {
      return NextResponse.redirect(redirectTo, 302);
    }
  } catch {
    /* invalid redirect target — fall through to the pixel */
  }

  /* Default: serve a transparent 1x1 GIF tracking pixel, always 200. */
  return new NextResponse(GIF_1PX, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF_1PX.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export async function POST(request) {
  try {
    let body = {};
    try {
      body = (await request.json()) || {};
    } catch {
      body = {};
    }
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    record(params, request);
  } catch {
    /* swallow */
  }
  /* Always 200, like the PHP trackers */
  return NextResponse.json({ success: true });
}
