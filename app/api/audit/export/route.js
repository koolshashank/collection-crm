import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { queryAuditLog, logActivity } from "@/lib/auditLog";
import { actionLabel, metaSummary, fmtAuditTs } from "@/lib/auditFormat";

export const dynamic = "force-dynamic";

/**
 * /api/audit/export — downloads every audit entry matching the current
 * filters (not just the visible page) as an .xlsx workbook, same shape as
 * the on-screen table. Admin only.
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
}

export async function GET(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const filters = {
    employeeId: sp.get("employeeId") || undefined,
    category: sp.get("category") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    search: sp.get("search") || undefined,
  };

  const { entries } = queryAuditLog({ ...filters, page: 1, limit: Number.MAX_SAFE_INTEGER });

  if (entries.length === 0) {
    return NextResponse.json({ success: false, message: "No records found to export for the current filters." });
  }

  const header = ["#", "When", "Employee", "Username", "Action", "Category", "Details", "Related To", "IP Address", "Status"];
  const rows = entries.map((e, i) => [
    i + 1,
    fmtAuditTs(e.ts),
    e.actor?.name || "",
    e.actor?.username || "",
    actionLabel(e.action),
    e.category || "",
    metaSummary(e),
    e.entity?.id ? `${e.entity.type || "id"} #${e.entity.id}` : "",
    e.ip || "",
    e.success ? "OK" : "Failed",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 5 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 14 },
    { wch: 36 }, { wch: 18 }, { wch: 15 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Log");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const stamp = new Date().toISOString().slice(0, 10);

  logActivity({
    session,
    action: "audit_export",
    category: "security",
    meta: { rows: entries.length, filters },
  });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audit_log_${stamp}.xlsx"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}
