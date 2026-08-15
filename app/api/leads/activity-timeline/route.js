import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";

/**
 * GET /api/leads/activity-timeline?lead_id=BLKR00021946
 * Port of get_activity_timeline.php.
 * Tries multiple BlinkR API endpoints and merges the results:
 *   1. collection/getActivityTimeline/{leadId}
 *   2. collection/getPaymentLinkLogs/{leadId}
 *   3. collection/getPTPLogs/{leadId}
 *   4. collection/getCollectionLogs/{leadId}
 * Returns: { success, count, data: [ {activity_type, description, tag, created_at, channel, done_by} ] }
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* PHP empty(): null/undefined/''/'0'/0/false are all "empty" */
function notEmpty(v) {
  return !(v === undefined || v === null || v === "" || v === "0" || v === 0 || v === false);
}

/* Mirror of tl_curl(): returns {} on any error / non-JSON response */
async function tlFetch(url, jwt) {
  const res = await rawGet(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${jwt}`,
      Cookie: `employee_jwt=${jwt}`,
    },
    timeoutMs: 12000,
  });
  if (res.error || res.data === null || res.data === "" || typeof res.data !== "object") {
    return {};
  }
  return res.data;
}

/* Mirror of tl_norm(): normalise an activity row into a standard shape */
function tlNorm(row, defaultType = "Activity") {
  return {
    activity_type: row.activity_type ?? row.type ?? row.category ?? defaultType,
    description: row.description ?? row.message ?? row.remarks ?? row.details ?? "",
    tag: row.tag ?? row.label ?? row.sub_type ?? "Info",
    created_at: row.created_at ?? row.timestamp ?? row.activity_date ?? "",
    channel: row.channel ?? row.medium ?? "",
    done_by: row.done_by ?? row.emp_name ?? row.created_by ?? "",
  };
}

/* PHP date('d M Y', strtotime($v)) */
function fmtDMY(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Unauthorized", data: [] });
    }

    const leadId = (new URL(request.url).searchParams.get("lead_id") || "").trim();
    if (!leadId) {
      return NextResponse.json({ success: false, message: "lead_id required", data: [] });
    }

    const jwt = session.jwt_token;
    const enc = encodeURIComponent(leadId); // PHP rawurlencode
    const activities = [];

    /* ══ ENDPOINT 1: Primary activity timeline ══ */
    const r1 = await tlFetch(
      apiUrl(`collection/getActivityTimeline/${enc}`),
      jwt
    );
    const rows1 = r1.data ?? r1.activities ?? r1.result ?? r1.timeline ?? [];
    if (Array.isArray(rows1)) {
      for (const row of rows1) activities.push(tlNorm(row || {}));
    }

    /* ══ ENDPOINT 2: Payment link logs (sent via SMS/Email/WhatsApp) ══ */
    const r2 = await tlFetch(
      apiUrl(`collection/getPaymentLinkLogs/${enc}`),
      jwt
    );
    const rows2 = r2.data ?? r2.result ?? r2.logs ?? [];
    if (Array.isArray(rows2)) {
      for (const raw of rows2) {
        const row = raw || {};
        const channel = String(row.channel ?? row.medium ?? "").toUpperCase();
        const tmpl = row.template_name ?? row.template ?? "";
        const appType = row.applicant_type ?? row.recipient_type ?? "applicant";
        let desc = "Payment Link sent via " + (channel || "UNKNOWN");
        if (tmpl) desc += " | Template Name: " + tmpl;
        if (appType) desc += " | Applicant Type: " + appType;
        activities.push(
          tlNorm({
            activity_type: "Payments",
            description: desc,
            tag: "Info",
            created_at: row.created_at ?? row.sent_at ?? row.timestamp ?? "",
          })
        );
      }
    }

    /* ══ ENDPOINT 3: PTP logs ══ */
    const r3 = await tlFetch(
      apiUrl(`collection/getPTPLogs/${enc}`),
      jwt
    );
    const rows3 = r3.data ?? r3.result ?? [];
    if (Array.isArray(rows3)) {
      for (const raw of rows3) {
        const row = raw || {};
        // PHP: '₹' . number_format((float)$row['ptp_amount'], 0)
        const amt = notEmpty(row.ptp_amount)
          ? "₹" + Math.round(parseFloat(row.ptp_amount) || 0).toLocaleString("en-US")
          : "";
        const date = notEmpty(row.ptp_date) ? fmtDMY(row.ptp_date) : "";
        let desc = "PTP set" + (amt ? " for " + amt : "") + (date ? " on " + date : "");
        if (notEmpty(row.remarks)) desc += " — " + row.remarks;
        activities.push(
          tlNorm({
            activity_type: "PTP",
            description: desc,
            tag: row.ptp_type ?? "PTP",
            created_at: row.created_at ?? "",
          })
        );
      }
    }

    /* ══ ENDPOINT 4: Collection/status change logs ══ */
    const r4 = await tlFetch(
      apiUrl(`collection/getCollectionLogs/${enc}`),
      jwt
    );
    const rows4 = r4.data ?? r4.result ?? [];
    if (Array.isArray(rows4)) {
      for (const row of rows4) activities.push(tlNorm(row || {}, "Status Update"));
    }

    /* ══ Sort all activities by date desc (string compare, like strcmp) ══ */
    activities.sort((a, b) => {
      const A = String(a.created_at);
      const B = String(b.created_at);
      return B > A ? 1 : B < A ? -1 : 0;
    });

    /* Remove empty entries */
    const filtered = activities.filter(
      (a) => notEmpty(a.activity_type) || notEmpty(a.description)
    );

    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error", data: [] },
      { status: 500 }
    );
  }
}
