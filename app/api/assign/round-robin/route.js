import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiGet, apiPost } from "@/lib/serverApi";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/assign/round-robin — 1:1 port of round_robin_assign.php.
 *
 * One-click round robin: fetches EVERY unassigned lead across the whole
 * system (all pages) and EVERY active employee, keeps only employees whose
 * designation is COLLECTION-EXECUTIVE, deals the leads out in rotation
 * (chunk_size at a time per agent), then calls the same
 * allocate-lead-to-employee API — once per agent, with that agent's share.
 *
 * Body: { lead_limit: number|null, chunk_size: number }
 * → { success, total_leads, total_agents, agents:[{id,name,count,success,message}], message }
 */

function normalizeDesignation(d) {
  return String(d || "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .toUpperCase();
}

export async function POST(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please login again." },
        { status: 401 }
      );
    }

    let reqBody = {};
    try {
      reqBody = (await request.json()) ?? {};
    } catch {
      reqBody = {};
    }

    const leadLimit =
      reqBody.lead_limit !== undefined && reqBody.lead_limit !== null && reqBody.lead_limit !== ""
        ? Math.max(1, parseInt(reqBody.lead_limit, 10) || 1)
        : null; // null = no limit, distribute every unassigned lead
    const chunkSize = reqBody.chunk_size !== undefined ? Math.max(1, parseInt(reqBody.chunk_size, 10) || 1) : 1;

    /* ── 1. Fetch EVERY unassigned lead, across all pages ── */
    let allLeadIds = [];
    const pageLimit = 200; // leads per API call — kept high to minimise round-trips
    const maxPages = 200; // safety cap: 200 × 200 = up to 40,000 leads
    let page = 1;
    let totalPages = 1;
    let lastLeadsCount = 0;

    do {
      const res = await apiGet("loan_list_unassigned", { params: { page, limit: pageLimit } });
      const body = res.ok && res.data && typeof res.data === "object" ? res.data : {};
      const leads = Array.isArray(body.leads) ? body.leads : [];
      lastLeadsCount = leads.length;

      for (const row of leads) {
        const leadId = row.lead_id ?? row.id ?? row.leadId ?? row.loan_id ?? null;
        if (leadId !== null && leadId !== "") allLeadIds.push(leadId);
        if (leadLimit !== null && allLeadIds.length >= leadLimit) break;
      }

      totalPages = parseInt(body?.pagination?.totalPages, 10) || 1;
      page++;
      if (leadLimit !== null && allLeadIds.length >= leadLimit) break;
    } while (page <= totalPages && page <= maxPages && lastLeadsCount > 0);

    /* Trim to the exact requested amount (the last page fetched may have overshot it) */
    if (leadLimit !== null) allLeadIds = allLeadIds.slice(0, leadLimit);

    if (allLeadIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No unassigned leads found — nothing to distribute.",
      });
    }

    /* ── 2. Fetch every employee, then keep only Collection Executives ── */
    const empRes = await apiGet("get_emp_list");
    const empBody = empRes.ok && empRes.data && typeof empRes.data === "object" ? empRes.data : {};
    const contactList =
      empBody.data ?? empBody.result ?? empBody.employees ?? empBody.list ?? [];

    const agents = [];
    const allDesignationsSeen = {};
    for (const emp of Array.isArray(contactList) ? contactList : []) {
      const empId = emp.emp_id ?? emp.id ?? emp.employee_id ?? emp.user_id ?? "";
      const empName = String(
        emp.emp_name || `${emp.f_name ?? ""} ${emp.l_name ?? ""}`
      ).trim();
      const empDes =
        emp.designation ?? emp.role ?? emp.emp_type ?? emp.position ?? emp.user_role ?? "";
      if (empId === "" || empName === "") continue;
      if (empDes !== "") allDesignationsSeen[empDes] = true;
      if (normalizeDesignation(empDes) !== "COLLECTION-EXECUTIVE") continue;
      agents.push({ id: empId, name: empName });
    }

    /* ?debug_emp=1 → dump raw employee records so the correct designation
       field/value can be identified (parity with the PHP endpoint). */
    const { searchParams } = new URL(request.url);
    if (searchParams.has("debug_emp")) {
      return NextResponse.json({
        total_employees_returned: Array.isArray(contactList) ? contactList.length : 0,
        sample_records: (Array.isArray(contactList) ? contactList : []).slice(0, 5),
        distinct_designations_seen: Object.keys(allDesignationsSeen),
      });
    }

    if (agents.length < 1) {
      const seen = Object.keys(allDesignationsSeen);
      return NextResponse.json({
        success: false,
        message:
          "No employees with designation COLLECTION-EXECUTIVE were found. " +
          (seen.length === 0
            ? "In fact no designation/role field was found on any employee record at all — the field name may be different than expected."
            : "Designations actually found in your employee list: " +
              seen.join(", ") +
              ". Update the match in round_robin_assign.php if the wording differs."),
      });
    }

    /* ── 3. Deal leads to agents in rotation, N (chunk_size) at a time.
       e.g. chunk_size=2 with agents [A,B,C]:
       leads 1,2 → A · leads 3,4 → B · leads 5,6 → C · leads 7,8 → A again … */
    const buckets = new Map();
    for (const a of agents) buckets.set(a.id, { agent: a, leadIds: [] });
    allLeadIds.forEach((leadId, i) => {
      const agentIndex = Math.floor(i / chunkSize) % agents.length;
      buckets.get(agents[agentIndex].id).leadIds.push(leadId);
    });

    /* ── 4. One allocate call per agent ── */
    const results = [];
    for (const bucket of buckets.values()) {
      if (bucket.leadIds.length === 0) continue;
      const res = await apiPost("collection/allocate-lead-to-employee", {
        leadIds: bucket.leadIds,
        employee_id: bucket.agent.id,
      });
      const success = res.ok && res.status >= 200 && res.status < 300;
      results.push({
        id: bucket.agent.id,
        name: bucket.agent.name,
        count: bucket.leadIds.length,
        success,
        message:
          (res.data && typeof res.data === "object" && res.data.message) ||
          res.error ||
          `HTTP ${res.status}`,
      });
    }

    const allOk = results.length > 0 && results.every((r) => r.success);

    logActivity({
      session,
      action: "lead_assigned_round_robin",
      category: "assignment",
      meta: { total_leads: allLeadIds.length, total_agents: results.length, chunk_size: chunkSize },
      success: allOk,
    });

    return NextResponse.json({
      success: allOk,
      total_leads: allLeadIds.length,
      total_agents: results.length,
      agents: results,
      message: allOk
        ? `${allLeadIds.length} leads distributed across ${results.length} agents.`
        : "Some agent groups failed — see details.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Unexpected server error during round robin distribution" },
      { status: 500 }
    );
  }
}
