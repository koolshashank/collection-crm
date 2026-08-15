import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveTeam } from "@/lib/teamsStore";
import { logActivity } from "@/lib/auditLog";

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

  const name = String(body.name || "").trim();
  const members = Array.isArray(body.members) ? body.members : [];
  if (!name) {
    return NextResponse.json({ success: false, message: "Team name is required." }, { status: 400 });
  }
  if (members.length === 0) {
    return NextResponse.json({ success: false, message: "Add at least one agent to the team." }, { status: 400 });
  }

  try {
    const teams = saveTeam({
      id: body.id || null,
      name,
      lead_name: String(body.lead_name || "").trim(),
      members,
    });
    logActivity({
      session,
      action: "team_updated",
      category: "teams",
      entity: { type: "team", id: body.id || name },
      meta: { name, member_count: members.length },
    });
    return NextResponse.json({ success: true, teams });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Failed to save team." }, { status: 400 });
  }
}
