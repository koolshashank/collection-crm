import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listCallStatusFacets } from "@/lib/callStatusStore";

/** GET /api/call-reports/facets — distinct dispositions/agents for filter dropdowns. */
export async function GET() {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, ...listCallStatusFacets() });
}
