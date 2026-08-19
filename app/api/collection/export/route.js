import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { rawGet } from "@/lib/serverApi";
import { paytrackerUrl } from "@/lib/apiConfig";
import { logActivity } from "@/lib/auditLog";

// Same role list the Collection menu item itself is gated to (menuConfig.js) —
// the UI already hid this from anyone else, but the route wasn't enforcing
// it, so a direct URL hit could bypass that gate entirely.
const ALLOWED_ROLES = ["ADMIN", "COLLECTION-HEAD", "ACM"];

export const dynamic = "force-dynamic";

/**
 * Mirror of collection_export.php + the client-side SheetJS build in
 * collection.php.
 *
 * Fetches EVERY lead matching the current Collection Report filters
 * (not just the visible page) by looping through collection-report
 * pages server-side, then builds the exact same workbook the old page
 * built in the browser (sheet "Collection Report", same 12 columns,
 * same column widths) and streams it back as
 *   collection_report_{startDate}_to_{endDate}.xlsx
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

async function fetchPage(jwt, startDate, endDate, search, page, perPage) {
  const params = new URLSearchParams({
    startDate,
    endDate,
    page: String(page),
    perPage: String(perPage),
  });
  if (search !== "") params.set("search_text", search);

  const res = await rawGet(
    paytrackerUrl(`portfolio/collection-report?${params.toString()}`),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        Cookie: `employee_jwt=${jwt}`,
      },
      timeoutMs: 15000,
    }
  );
  return res.data && typeof res.data === "object" ? res.data : {};
}

/* Same bucket logic as collection.php's coCollectionType() */
function collectionType(l) {
  if (Number(l.ontime_collection) > 0) return "On-time";
  if (Number(l.pre_collection) > 0) return "Pre";
  if (Number(l.post_collection) > 0) return "Post";
  return "--";
}

export async function GET(request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Session expired. Please login again." }, { status: 401 });
    }
    if (!(session.roles ?? []).some((r) => ALLOWED_ROLES.includes(r))) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to export this report." },
        { status: 403 }
      );
    }
    const jwt = session.jwt_token;
    const sp = request.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate") || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const endDate = sp.get("endDate") || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const search = (sp.get("search") ?? "").trim();

    const allLeads = [];
    let page = 1;
    const perPage = 100; // pull in bigger pages while exporting, to minimise round-trips
    const maxPages = 100; // safety cap: 100 × 100 = up to 10,000 rows
    let totalPages = 1;
    let leads = [];

    do {
      const body = await fetchPage(jwt, startDate, endDate, search, page, perPage);
      leads = Array.isArray(body.leads) ? body.leads : [];
      for (const l of leads) allLeads.push(l);
      totalPages = parseInt(body?.pagination?.totalPages ?? 1, 10) || 1;
      page++;
    } while (page <= totalPages && page <= maxPages && leads.length > 0);

    if (!allLeads.length) {
      return NextResponse.json({
        success: false,
        message: "No records found to export for the current filters.",
      });
    }

    logActivity({
      session,
      action: "collection_export",
      category: "payments",
      entity: null,
      meta: { rows: allLeads.length, startDate, endDate, search: search || undefined },
    });

    /* Same header row / column order as the old client-side export */
    const header = [
      "#", "Borrower", "Mobile", "PAN", "Loan No", "Repayment Date", "Type",
      "Pre Collection", "On-time Collection", "Post Collection", "Total Collection", "Last Collection Date",
    ];
    const rows = allLeads.map((l, i) => [
      i + 1,
      l.full_name || "",
      l.mobile || "",
      l.pan || "",
      l.loan_no || "",
      l.repayment_date || "",
      collectionType(l),
      Number(l.pre_collection || 0),
      Number(l.ontime_collection || 0),
      Number(l.post_collection || 0),
      Number(l.total_collection || 0),
      l.last_collection_date_ist || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 9 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection Report");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `collection_report_${startDate}_to_${endDate}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Server error while exporting." }, { status: 500 });
  }
}
