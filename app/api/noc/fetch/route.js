import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { apiUrl as buildApiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/noc/fetch?loan_no=…
 * Port of noc_fetch.php — fetch loan details by loan_no for NOC generation.
 * Returns JSON { success, data, message } with the exact same payload shape.
 */

/** cURL helper mirror (noc_curl): 15s timeout, Bearer + employee_jwt cookie headers. */
async function nocCurl(url, jwt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
        Cookie: "employee_jwt=" + jwt,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!text) return { ok: false, code: res.status, body: null };
    let dec = null;
    try {
      dec = JSON.parse(text);
    } catch {
      dec = null;
    }
    return { ok: true, code: res.status, body: dec };
  } catch {
    return { ok: false, code: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request) {
  try {
    /* ── Auth ── */
    const session = getSession();
    if (!session?.jwt_token) {
      return NextResponse.json({ success: false, message: "Session expired. Please log in again." });
    }
    const jwt = session.jwt_token;

    const { searchParams } = new URL(request.url);
    const loanNo = (searchParams.get("loan_no") || "").trim();
    if (loanNo === "") {
      return NextResponse.json({ success: false, message: "Loan number is required." });
    }

    /* ── 1. Fetch loan by loan_no ── */
    const apiUrl = buildApiUrl(`collection/getLoanDetails/${encodeURIComponent(loanNo)}`);
    const result = await nocCurl(apiUrl, jwt);

    let loanData = null;
    if (!result.ok || !result.body?.data || (Array.isArray(result.body.data) && result.body.data.length === 0)) {
      /* Try alternate search endpoint */
      const searchUrl = buildApiUrl(`collection/getLoanList1/portfolio?search_text=${encodeURIComponent(loanNo)}`);
      const sResult = await nocCurl(searchUrl, jwt);
      const leads = sResult.body?.leads || [];

      if (!leads.length) {
        return NextResponse.json({
          success: false,
          message: "Loan not found. Check the loan number and try again.",
        });
      }

      /* Use first matching lead — fetch full details by lead_id */
      const leadId = leads[0]?.lead_id ?? leads[0]?.id ?? null;
      if (!leadId) {
        return NextResponse.json({ success: false, message: "Could not resolve loan details." });
      }
      const detailUrl = buildApiUrl(`collection/getLoanDetails/${encodeURIComponent(leadId)}`);
      const detResult = await nocCurl(detailUrl, jwt);
      loanData = detResult.body?.data ?? null;
    } else {
      loanData = result.body.data;
    }

    if (!loanData || (Array.isArray(loanData) && loanData.length === 0)) {
      return NextResponse.json({ success: false, message: "No loan data returned for: " + loanNo });
    }

    /* ── 2. Fetch email from PAN if available ── */
    const pan = loanData.pan ?? null;
    if (pan) {
      const addrResult = await nocCurl(
        buildApiUrl(`collection/getAddress/${encodeURIComponent(pan)}`),
        jwt
      );
      const addrData = addrResult.body?.result || {};
      /* Merge address fields into loanData if not present */
      if (addrData.email && !loanData.personal_email) {
        loanData.personal_email = addrData.email;
      }
    }

    /* ── 3. Build clean response payload (field-for-field identical to PHP) ── */
    const loanStatus = String(loanData.loan_status ?? loanData.status ?? "").toLowerCase();

    const response = {
      success: true,
      data: {
        /* Identity */
        loan_no: loanData.loan_no ?? loanNo,
        lead_id: loanData.lead_id ?? loanData.id ?? "",
        full_name: loanData.full_name ?? `${loanData.f_name ?? ""} ${loanData.l_name ?? ""}`,
        mobile: loanData.mobile ?? "",
        alternate_mobile: loanData.alternate_mobile ?? "",
        personal_email: loanData.personal_email ?? "",
        office_email: loanData.office_email ?? "",
        pan: loanData.pan ?? "",

        /* Loan financials */
        loan_amount: parseFloat(loanData.loan_amount ?? 0) || 0,
        repayment_amount: parseFloat(loanData.repayment_amount ?? 0) || 0,
        collection_amount: parseFloat(loanData.collection_amount ?? 0) || 0,
        waiver_amount: parseFloat(loanData.waiver_amount ?? 0) || 0,
        penalty_amount: parseFloat(loanData.penalty_amount ?? 0) || 0,
        net_disbursal: parseFloat(loanData.net_disbursal ?? 0) || 0,
        admin_fee: parseFloat(loanData.admin_fee ?? 0) || 0,

        /* Dates */
        sanction_date: loanData.sanction_date ?? "",
        repayment_date: loanData.repayment_date ?? "",
        collection_date: loanData.collection_date ?? "",
        disbursal_date: loanData.disbursal_date_ist ?? loanData.disbursal_date ?? "",

        /* Loan meta */
        tenure: loanData.tenure ?? "",
        loan_status: loanStatus,
        overdue_days: parseInt(loanData.overdue_days ?? 0, 10) || 0,
        loan_type: loanData.loan_type ?? "Personal Loan",
        product_type: loanData.product_type ?? "Blinkr Loan",
        roi: loanData.roi ?? "",
        bank_acc_no: loanData.bank_acc_no ?? "",
        ifsc_code: loanData.ifsc_code ?? "",

        /* Eligibility flag */
        noc_eligible: loanStatus === "closed",
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Loan not found. Check the loan number and try again." },
      { status: 200 }
    );
  }
}
