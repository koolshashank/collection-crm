import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { apiUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

/**
 * GET /api/docs/additional?lead_id=…
 * Port of get_aditional_doc.php.
 * IMPORTANT: this endpoint returns an HTML FRAGMENT (not JSON) — the
 * client-info page injects it directly, exactly like the PHP original.
 * Backend: collection/documents/{lead_id} + collection/generate-presigned-url.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* htmlspecialchars (ENT_QUOTES-style) */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* PHP date('d M Y, h:i A', strtotime($v)) */
function fmtDateTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--";
  let h = d.getUTCHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return (
    `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ` +
    `${String(h).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`
  );
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request) {
  try {
    const session = getSession();
    if (!session?.jwt_token) {
      return html('<p style="color:red;padding:16px">Session expired. Please login again.</p>');
    }

    const { searchParams } = new URL(request.url);
    if (!searchParams.has("lead_id")) {
      return html('<p style="color:orange;padding:16px">No lead ID provided.</p>');
    }

    const lead_id = (searchParams.get("lead_id") || "").trim();
    const token = session.jwt_token;

    const listRes = await rawGet(
      apiUrl(`collection/documents/${encodeURIComponent(lead_id)}`),
      { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15000 }
    );
    const data = listRes.data !== null && typeof listRes.data === "object" ? listRes.data : {};
    const documents = Array.isArray(data.data) ? data.data : [];

    if (documents.length === 0) {
      return html(
        '<p style="color:var(--text-soft);padding:16px;text-align:center">No additional documents found.</p>'
      );
    }

    logActivity({
      session,
      action: "document_viewed",
      category: "view",
      entity: { type: "lead", id: lead_id },
      meta: { doc_type: "ADDITIONAL", count: documents.length },
    });

    let out = `<style>
.ad-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
.ad-card  { background:var(--panel-bg,#fffdf9); border:1px solid var(--border,#e4d9cc); border-radius:12px; padding:16px; }
.ad-type  { font-family:'Playfair Display',serif; font-size:.88rem; color:var(--text-dark,#2c2318); margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border,#e4d9cc); }
.ad-row   { display:flex; justify-content:space-between; font-size:.78rem; padding:4px 0; border-bottom:1px solid var(--border,#e4d9cc); }
.ad-lbl   { color:var(--text-soft,#a08c78); }
.ad-val   { font-weight:600; color:var(--text-dark,#2c2318); }
.ad-btn   { display:inline-flex; align-items:center; gap:6px; margin-top:12px; padding:6px 14px; background:var(--accent,#b07d4a); color:#fff; border-radius:8px; font-size:.78rem; font-weight:600; text-decoration:none; transition:background .2s; }
.ad-btn:hover { background:var(--accent-dark,#8a5e30); }
</style>
<div class="ad-grid">
`;

    for (const doc of documents) {
      /* Generate presigned URL for each doc (same per-doc call as PHP) */
      const signRes = await rawGet(
        apiUrl(`collection/generate-presigned-url?document_url=${encodeURIComponent(doc?.document_url ?? "")}`),
        { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 10000 }
      );
      const sRes = signRes.data !== null && typeof signRes.data === "object" ? signRes.data : {};
      const dlUrl = sRes.downloadUrl ?? "#";
      const dateTime = doc?.created_at ? fmtDateTime(doc.created_at) : "--";

      out += `<div class="ad-card">
    <div class="ad-type">${esc(String(doc?.document_type ?? "Document").replace(/_/g, " "))}</div>
    <div class="ad-row"><span class="ad-lbl">Upload Date</span><span class="ad-val">${esc(dateTime)}</span></div>
    <div class="ad-row"><span class="ad-lbl">Remarks</span><span class="ad-val">${esc(doc?.remarks ?? "—")}</span></div>
    <a class="ad-btn" href="${esc(dlUrl)}" target="_blank">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        View Document
    </a>
</div>
`;
    }

    out += "</div>";
    return html(out);
  } catch {
    return html('<p style="color:red;padding:16px">Something went wrong. Please try again.</p>', 500);
  }
}
