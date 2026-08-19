import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/docs/list?lead_id=… — every document on file for a lead, as
 * plain JSON (presigned download URL included), for pages that want to
 * render the list inline rather than injecting the /api/docs/additional
 * HTML fragment. Same backend calls as that route: collection/documents/
 * {lead_id} + collection/generate-presigned-url per document.
 */
export async function GET(request) {
  const session = getSession();
  if (!session?.jwt_token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const lead_id = (new URL(request.url).searchParams.get("lead_id") || "").trim();
  if (!lead_id) {
    return NextResponse.json({ success: false, message: "lead_id is required." }, { status: 400 });
  }
  const token = session.jwt_token;

  const listRes = await rawGet(
    apiUrl(`collection/documents/${encodeURIComponent(lead_id)}`),
    { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15000 }
  );
  const data = listRes.data !== null && typeof listRes.data === "object" ? listRes.data : {};
  const rawDocs = Array.isArray(data.data) ? data.data : [];

  const documents = await Promise.all(
    rawDocs.map(async (doc) => {
      const signRes = await rawGet(
        apiUrl(`collection/generate-presigned-url?document_url=${encodeURIComponent(doc?.document_url ?? "")}`),
        { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 10000 }
      );
      const signed = signRes.data !== null && typeof signRes.data === "object" ? signRes.data : {};
      return {
        type: doc?.document_type ?? "Document",
        url: signed.downloadUrl ?? null,
        createdAt: doc?.created_at ?? null,
        remarks: doc?.remarks ?? null,
      };
    })
  );

  if (documents.length) {
    logActivity({
      session,
      action: "document_viewed",
      category: "view",
      entity: { type: "lead", id: lead_id },
      meta: { doc_type: "LIST", count: documents.length },
    });
  }

  return NextResponse.json({ success: true, documents });
}
