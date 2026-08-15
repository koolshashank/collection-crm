import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/docs/aadhar?lead_id=…
 * Port of get_aadhar.php — looks up the AADHAAR / AADHAAR_IMAGE document for
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

    const lead_id = (new URL(request.url).searchParams.get("lead_id") || "").trim();
    const token = session.jwt_token;
    if (!lead_id) return text("lead_id missing");

    /* Step 1 – list documents */
    const listRes = await rawGet(
      apiUrl(`collection/documents/${encodeURIComponent(lead_id)}`),
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeoutMs: 15000,
      }
    );
    const data = listRes.data !== null && typeof listRes.data === "object" ? listRes.data : {};

    let aadhaarDoc = null;
    let aadhaarImg = null;
    for (const doc of Array.isArray(data.data) ? data.data : []) {
      if (doc?.document_type === "AADHAAR") aadhaarDoc = doc;
      if (doc?.document_type === "AADHAAR_IMAGE") aadhaarImg = doc;
    }

    const docUrl = aadhaarDoc?.document_url ?? aadhaarImg?.document_url ?? null;
    if (!docUrl) return text("Aadhaar not available for this lead.");

    /* Step 2 – presigned URL */
    const signRes = await rawGet(
      apiUrl(`collection/generate-presigned-url?document_url=${encodeURIComponent(docUrl)}`),
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        timeoutMs: 15000,
      }
    );
    const signed = signRes.data !== null && typeof signRes.data === "object" ? signRes.data : {};

    if (signed.downloadUrl) {
      logActivity({
        session,
        action: "document_viewed",
        category: "view",
        entity: { type: "lead", id: lead_id },
        meta: { doc_type: "AADHAAR" },
      });
      return NextResponse.redirect(signed.downloadUrl, 302);
    }
    return text("Failed to generate Aadhaar download link.");
  } catch {
    return text("Failed to generate Aadhaar download link.", 500);
  }
}
