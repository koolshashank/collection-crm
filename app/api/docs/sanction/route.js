import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/docs/sanction?lead_id=…&doc_type=SANCTION_LETTER
 * Port of get_sanction.php — finds the document of the requested type for
 * the lead, generates a presigned URL and 302-redirects to it.
 * Error paths return plain-text bodies, exactly like the PHP original.
 */

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const lead_id = (searchParams.get("lead_id") || "").trim();
    const doc_type = (searchParams.get("doc_type") || "SANCTION_LETTER").trim() || "SANCTION_LETTER";
    const token = session.jwt_token;

    if (!lead_id) return text("lead_id missing");

    /* Step 1 – list documents */
    const listRes = await rawGet(
      apiUrl(`collection/documents/${encodeURIComponent(lead_id)}`),
      { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15000 }
    );
    const data = listRes.data !== null && typeof listRes.data === "object" ? listRes.data : {};

    let document_url = null;
    for (const doc of Array.isArray(data.data) ? data.data : []) {
      if ((doc?.document_type ?? "") === doc_type) {
        document_url = doc?.document_url ?? null;
        break;
      }
    }
    if (!document_url) return text(`Document not found (type: ${doc_type})`);

    /* Step 2 – presigned URL */
    const signRes = await rawGet(
      apiUrl(`collection/generate-presigned-url?document_url=${encodeURIComponent(document_url)}`),
      { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15000 }
    );
    const signed = signRes.data !== null && typeof signRes.data === "object" ? signRes.data : {};

    if (signed.downloadUrl) {
      logActivity({
        session,
        action: "document_viewed",
        category: "view",
        entity: { type: "lead", id: lead_id },
        meta: { doc_type },
      });
      return NextResponse.redirect(signed.downloadUrl, 302);
    }
    return text("Failed to generate download link.");
  } catch {
    return text("Failed to generate download link.", 500);
  }
}
