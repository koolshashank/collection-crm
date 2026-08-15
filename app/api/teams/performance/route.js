import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { listTeams } from "@/lib/teamsStore";
import { paytrackerUrl } from "@/lib/apiConfig";

/**
 * GET /api/teams/performance — team-wise collection performance.
 *
 * ⚠️ ASSUMPTION: there's no team-aware endpoint on the real backend, so
 * this reuses the exact same portfolio list endpoint the Leads page calls
 * (portfolio/getLoanList1/portfolio), once per agent in each team, and
 * sums up sanction_amount / is_reloan_case across all of that agent's
 * loans. For teams with agents who have very large portfolios this means
 * a bigger `limit` fetch per agent (capped at 2000) — if an agent has
 * more loans than that, their numbers here will be an undercount. Flag
 * this to the team if that turns out to matter for any agent.
 */
const PER_AGENT_LIMIT = 2000;

async function fetchAgentLoans(agentName, token) {
  const params = new URLSearchParams({ page: "1", limit: String(PER_AGENT_LIMIT), agent_name: agentName });
  const url = paytrackerUrl(`portfolio/getLoanList1/portfolio?${params.toString()}`);
  const res = await rawGet(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    timeoutMs: 15000,
  });
  if (res.error) return { leads: [], error: true };
  const data = typeof res.data === "object" && res.data !== null ? res.data : {};
  return { leads: Array.isArray(data.leads) ? data.leads : [], error: false };
}

function isReloan(row) {
  return row.is_reloan_case && row.is_reloan_case !== false && row.is_reloan_case !== "false" && row.is_reloan_case !== "0";
}

export async function GET() {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teams = listTeams();
  if (teams.length === 0) {
    return NextResponse.json({ success: true, teams: [] });
  }

  try {
    const results = await Promise.all(
      teams.map(async (team) => {
        const perAgent = await Promise.all(
          (team.members || []).map((agent) => fetchAgentLoans(agent, session.jwt_token))
        );

        let totalSanction = 0;
        let freshSanction = 0;
        let reloanSanction = 0;
        let freshLoans = 0;
        let reloanLoans = 0;
        let anyAgentError = false;

        for (const { leads, error } of perAgent) {
          if (error) anyAgentError = true;
          for (const row of leads) {
            const amt = Number(row.sanction_amount) || 0;
            totalSanction += amt;
            if (isReloan(row)) {
              reloanSanction += amt;
              reloanLoans += 1;
            } else {
              freshSanction += amt;
              freshLoans += 1;
            }
          }
        }

        const totalLoans = freshLoans + reloanLoans;
        const empCount = (team.members || []).length;

        return {
          id: team.id,
          name: team.name,
          lead_name: team.lead_name,
          emp_count: empCount,
          total_sanction: totalSanction,
          sanction_per_loan: totalLoans > 0 ? totalSanction / totalLoans : 0,
          sanction_per_emp: empCount > 0 ? totalSanction / empCount : 0,
          fresh_share_pct: totalLoans > 0 ? (freshLoans / totalLoans) * 100 : 0,
          reloan_share_pct: totalLoans > 0 ? (reloanLoans / totalLoans) * 100 : 0,
          fresh_sanction: freshSanction,
          reloan_sanction: reloanSanction,
          fresh_loans: freshLoans,
          reloan_loans: reloanLoans,
          total_loans: totalLoans,
          partial_data: anyAgentError, // true if any member's fetch failed — numbers may be incomplete
        };
      })
    );

    return NextResponse.json({ success: true, teams: results });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Failed to compute performance." }, { status: 500 });
  }
}
