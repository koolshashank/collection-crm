import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listTeams } from "@/lib/teamsStore";

export async function GET() {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, teams: listTeams() });
}
