import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteTeam } from "@/lib/teamsStore";
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
  if (!body.id) {
    return NextResponse.json({ success: false, message: "Team id is required." }, { status: 400 });
  }
  const teams = deleteTeam(body.id);
  logActivity({ session, action: "team_deleted", category: "teams", entity: { type: "team", id: body.id } });
  return NextResponse.json({ success: true, teams });
}
