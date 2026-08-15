"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import LeadsPagination from "@/components/leads/LeadsPagination";

const ACTION_LABELS = {
  login: "Logged in",
  login_failed: "Login failed",
  logout: "Logged out",
  payment_posted: "Posted a payment",
  ptp_submitted: "Submitted a PTP",
  settlement_action: "Settlement action",
  loan_correction_reopen: "Reopened a loan",
  loan_correction_delete_payment: "Deleted a payment (correction)",
  lead_assigned: "Assigned leads",
  lead_assigned_bulk: "Bulk-assigned leads",
  lead_assigned_round_robin: "Round-robin assigned leads",
  noc_generated: "Generated a NOC",
  noc_emailed: "Emailed a NOC",
  settings_changed: "Changed a setting",
  team_updated: "Updated a team",
  team_deleted: "Deleted a team",
  customer_viewed: "Viewed a customer profile",
  loan_history_viewed: "Viewed loan history",
  document_viewed: "Viewed a document",
  whatsapp_sent: "Sent a WhatsApp message",
  whatsapp_sent_freeform: "Sent a WhatsApp message",
  pan_blocked: "Blocked a PAN",
  reloan_enabled: "Enabled reloan",
  remark_added: "Added a remark",
  payment_link_generated: "Generated a payment link",
  cibil_step_run: "Ran a CIBIL pipeline step",
};

function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function fmtTs(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function metaSummary(entry) {
  const parts = [];
  if (entry.entity?.id) parts.push(`${entry.entity.type || "id"}: ${entry.entity.id}`);
  const meta = entry.meta || {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${k}: ${Array.isArray(v) ? v.join(",") : v}`);
  }
  return parts.join(" · ") || "—";
}

const CATEGORY_OPTIONS = [
  "auth", "payments", "ptp", "settlement", "loan_correction", "assignment",
  "noc", "settings", "teams", "employees", "view", "whatsapp", "cibil", "other",
];

export default function AuditLogPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(null);

  const [actors, setActors] = useState([]);
  const [filters, setFilters] = useState({ employeeId: "", category: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    const isAdmin = roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.employeeId) qs.set("employeeId", filters.employeeId);
    if (filters.category) qs.set("category", filters.category);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);

    const [actorsRes, auditRes] = await Promise.all([
      clientFetch("/api/audit/actors"),
      clientFetch(`/api/audit?${qs.toString()}`),
    ]);

    if (!auditRes.ok || !auditRes.data?.success) {
      setError(auditRes.data?.message || "Could not load the audit log.");
      setLoading(false);
      return;
    }

    if (actorsRes.ok && actorsRes.data?.success) setActors(actorsRes.data.actors ?? []);
    setRows(auditRes.data.entries ?? []);
    setTotal(auditRes.data.total ?? 0);
    setLoading(false);
  }, [router, page, limit, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading || !allowed) return <PageLoader label="Loading audit log…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">Every employee's activity on the CRM</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      <div className="card mb-5 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3.5 border-b border-line bg-surface px-5 py-4">
          <div>
            <label className="label">Employee</label>
            <select
              className="input !w-auto"
              value={filters.employeeId}
              onChange={(e) => updateFilter("employeeId", e.target.value)}
            >
              <option value="">All employees</option>
              {actors.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input !w-auto"
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input !w-auto"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input !w-auto"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No activity found for these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="th whitespace-nowrap">When</th>
                  <th className="th">Employee</th>
                  <th className="th">Action</th>
                  <th className="th">Details</th>
                  <th className="th text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                    <td className="td whitespace-nowrap text-gray-500">{fmtTs(entry.ts)}</td>
                    <td className="td font-semibold text-gray-800">{entry.actor?.name || entry.actor?.username || "—"}</td>
                    <td className="td">{actionLabel(entry.action)}</td>
                    <td className="td text-xs text-gray-600">{metaSummary(entry)}</td>
                    <td className="td text-center">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          entry.success
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-danger"
                        }`}
                      >
                        {entry.success ? "OK" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LeadsPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onGotoPage={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
          onChangeLimit={(v) => {
            setLimit(Number(v));
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
