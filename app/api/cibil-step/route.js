import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet, rawPost } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { getStep } from "@/lib/cibil/steps";
import { logActivity } from "@/lib/auditLog";

/**
 * /api/cibil/[step] — runs one step of the CIBIL pipeline.
 *
 * GET  → for "fetch" steps (returns rows)
 * POST → for "mutate" steps (close loans, run procedure)
 *
 * ⚠️ Until each step has an `endpoint` set in lib/cibil/steps.js this
 * responds 501 with a message the UI displays as-is. The forwarding code
 * below is already written, so filling in the endpoint is all that's
 * needed later — no changes here.
 */

async function runStep(request, params) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const step = getStep(params.step);
  if (!step) {
    return NextResponse.json({ success: false, message: "Unknown step." }, { status: 404 });
  }

  if (!step.endpoint) {
    return NextResponse.json(
      {
        success: false,
        notConnected: true,
        message: `Step ${step.step} ("${step.title}") has no API endpoint yet. Add it to lib/cibil/steps.js once the backend is ready.`,
      },
      { status: 501 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${session.jwt_token}`,
    Cookie: `employee_jwt=${session.jwt_token}`,
  };

  let res;
  if ((step.method || "GET").toUpperCase() === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    res = await rawPost(apiUrl(step.endpoint), { ...body, from_date: from, to_date: to }, {
      headers,
      timeoutMs: 120000, // stored procedures and bulk closes can be slow
    });
  } else {
    const qs = new URLSearchParams();
    if (from) qs.set("from_date", from);
    if (to) qs.set("to_date", to);
    res = await rawGet(apiUrl(`${step.endpoint}${qs.toString() ? `?${qs}` : ""}`), {
      headers,
      timeoutMs: 120000,
    });
  }

  if (res.error) {
    return NextResponse.json(
      { success: false, message: `Connection error: ${res.error}` },
      { status: 502 }
    );
  }

  const body = res.data !== null && typeof res.data === "object" ? res.data : {};
  const rows =
    [body.data, body.result, body.rows, body.records].find(Array.isArray) ||
    (Array.isArray(body) ? body : []);
  const success = body.success !== false && res.ok;

  if ((step.method || "GET").toUpperCase() === "POST") {
    logActivity({
      session,
      action: "cibil_step_run",
      category: "cibil",
      meta: { step: step.step, title: step.title, from, to },
      success,
    });
  }

  return NextResponse.json({
    success: body.success !== false && res.ok,
    message: body.message || null,
    rows,
    count: Number(body.count ?? body.total ?? rows.length) || rows.length,
  });
}

export async function GET(request, { params }) {
  return runStep(request, params);
}

export async function POST(request, { params }) {
  return runStep(request, params);
}
