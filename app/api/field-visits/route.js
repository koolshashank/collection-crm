import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  listFieldVisits,
  createFieldVisit,
  fieldVisitSummary,
  fieldVisitAgents,
} from "@/lib/fieldVisitStore";

/**
 * GET  /api/field-visits            → { rows, pagination, summary, agents }
 * POST /api/field-visits            → create one visit
 *
 * Backed by lib/fieldVisitStore (local JSON) until the backend exposes real
 * field-visit endpoints — see the warning at the top of that file.
 */
export async function GET(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const { rows, pagination } = listFieldVisits({
    search: sp.get("search") || "",
    status: sp.get("status") || "",
    agent: sp.get("agent") || "",
    from: sp.get("from") || "",
    to: sp.get("to") || "",
    page: Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1),
    limit: Math.max(parseInt(sp.get("limit") || "25", 10) || 25, 1),
  });

  return NextResponse.json({
    success: true,
    rows,
    pagination,
    summary: fieldVisitSummary(),
    agents: fieldVisitAgents(),
  });
}

export async function POST(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  if (!String(body.agent_id ?? "").trim() || !String(body.visit_date ?? "").trim()) {
    return NextResponse.json(
      { success: false, message: "Agent and visit date are required." },
      { status: 400 }
    );
  }
  if (!String(body.lead_id ?? "").trim() && !String(body.loan_id ?? "").trim()) {
    return NextResponse.json(
      { success: false, message: "Lead ID or Loan ID is required." },
      { status: 400 }
    );
  }

  const visit = createFieldVisit({ ...body, assigned_by: session.name || session.username || "" });
  return NextResponse.json({ success: true, visit });
}
