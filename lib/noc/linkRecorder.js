import fs from "fs";
import path from "path";
import { apiUrl } from "../apiConfig";

/**
 * lib/noc/linkRecorder.js — port of includes/noc_link_recorder.php
 *
 * Records the S3 link of a sent NOC "against the customer" —
 * i.e. associates it with their loan/lead so it can be looked up
 * later (e.g. shown in client-info's Documents tab, or in an
 * audit trail).
 *
 * ⚠️ NO CONFIRMED BACKEND ENDPOINT for this existed anywhere in the
 * PHP project. Same as the PHP, this function does TWO things:
 *   1. Always logs locally to storage/noc_links.jsonl (so nothing
 *      is ever lost even if the backend call below is wrong/missing)
 *   2. ALSO attempts to POST to the guessed backend endpoint
 *      (backend.blinkrloan.com/api/collection/saveNocDocument).
 *      The local log stays as a safety net either way.
 *
 * Returns {success, message} — never throws (all failures swallowed,
 * exactly like the PHP which only error_log()'d them).
 */
export async function saveNocLinkForCustomer(loanNo, leadId, s3Url, sentTo, jwtToken) {
  /* 1. Always log locally first — this never fails silently */
  try {
    const logDir = path.join(process.cwd(), "storage");
    fs.mkdirSync(logDir, { recursive: true });
    const now = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const createdAt = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    const logLine =
      JSON.stringify({
        loan_no: loanNo,
        lead_id: leadId,
        s3_url: s3Url,
        sent_to: sentTo,
        created_at: createdAt,
      }) + "\n";
    fs.appendFileSync(path.join(logDir, "noc_links.jsonl"), logLine, "utf8");
  } catch (err) {
    console.error("[NOC-LINK] local log failed:", err?.message);
  }

  /* 2. ⚠️ GUESSED endpoint — confirm/replace with the real backend API */
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // CURLOPT_TIMEOUT 10
    const res = await fetch(apiUrl("collection/saveNocDocument"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (jwtToken || ""),
      },
      body: JSON.stringify({
        loan_no: loanNo,
        lead_id: leadId,
        document_url: s3Url,
        document_type: "NOC",
        sent_to: sentTo,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    if (data && typeof data === "object" && data.success) {
      return { success: true, message: "Saved to backend and local log." };
    }
    console.error("[NOC-LINK] Backend responded without success — saved locally only. Response: " + text);
    return { success: true, message: "Saved locally; backend response was not a success (see error log)." };
  } catch (err) {
    console.error("[NOC-LINK] Backend save failed (logged locally as fallback): " + (err?.message || err));
    return { success: true, message: "Saved locally; backend API call failed (see error log)." };
  }
}
