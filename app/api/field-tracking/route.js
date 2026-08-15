import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet } from "@/lib/serverApi";
import { clockedInAgentIds, agentDayStatus, agentActivity } from "@/lib/fieldTrackingStore";
import { listFieldVisits } from "@/lib/fieldVisitStore";

/**
 * GET /api/field-tracking?date=YYYY-MM-DD            → agent list + summary
 * GET /api/field-tracking?agent_id=X&date=YYYY-MM-DD → one agent's detail
 *
 * The agent list is REAL (collection/getEmpList — the same source the
 * "Assign to Field" modals use). Clock-in/out, live location and route
 * come from lib/fieldTrackingStore, which has no backend feed yet — see
 * the warning at the top of that file. Visits Today is real, read from
 * the field-visit store.
 */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normaliseAgent(a) {
  const id = a.id ?? a.emp_id ?? a.employee_id ?? a.user_id;
  const name =
    `${a.f_name ?? a.first_name ?? ""} ${a.l_name ?? a.last_name ?? ""}`.trim() ||
    a.name ||
    a.employee_name ||
    String(id ?? "");
  return {
    id: String(id ?? ""),
    name,
    email: a.email ?? null,
    mobile: a.mobile ?? a.phone ?? null,
  };
}

async function loadAgents() {
  const res = await apiGet("get_emp_list");
  if (res.error) return { agents: [], error: res.error };
  const d = res.data ?? {};
  const list = d.data || d.result || d.employees || (Array.isArray(d) ? d : []);
  return { agents: list.map(normaliseAgent).filter((a) => a.id), error: null };
}

export async function GET(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const date = sp.get("date") || today();
  const agentId = (sp.get("agent_id") || "").trim();

  /* ── Detail view for one agent ── */
  if (agentId) {
    const status = agentDayStatus(agentId, date);
    const visits = listFieldVisits({ page: 1, limit: 500 }).rows.filter(
      (v) => String(v.agent_id) === agentId && v.visit_date === date
    );

    return NextResponse.json({
      success: true,
      date,
      agent_id: agentId,
      status,
      activity: agentActivity(agentId, date),
      visits,
      summary: {
        visits_assigned: visits.length,
        visits_completed: visits.filter((v) => v.status === "completed").length,
        route_points: status.route.length,
      },
    });
  }

  /* ── List + top-line summary ── */
  const { agents, error } = await loadAgents();
  if (error) {
    return NextResponse.json(
      { success: false, message: `Could not load field staff — ${error}`, agents: [] },
      { status: 502 }
    );
  }

  const clockedIn = clockedInAgentIds(date);
  const visitsToday = listFieldVisits({ page: 1, limit: 1000 }).rows.filter(
    (v) => v.visit_date === date
  );

  const rows = agents.map((a) => {
    const st = agentDayStatus(a.id, date);
    return {
      ...a,
      clocked_in: clockedIn.has(a.id),
      clock_in_at: st.clock_in_at,
      last_ping: st.last_ping,
      visits_today: visitsToday.filter((v) => String(v.agent_id) === a.id).length,
    };
  });

  return NextResponse.json({
    success: true,
    date,
    agents: rows,
    summary: {
      clocked_in: rows.filter((r) => r.clocked_in).length,
      total_staff: rows.length,
      visits_today: visitsToday.length,
      // No collection-by-agent feed exists yet, so this stays 0 rather than
      // showing a number that isn't actually per-field-agent.
      collected_today: 0,
      not_clocked_in: rows.length - rows.filter((r) => r.clocked_in).length,
    },
  });
}
