"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import Modal from "@/components/ui/Modal";
import { CiIcon, WhatsAppIcon } from "@/components/client-info/icons";
import LeadsPagination from "@/components/leads/LeadsPagination";
import { avatarColor, initials } from "@/lib/avatarColor";
import {
  actionLabel,
  categoryMeta,
  entityTone,
  metaSummary,
  fmtAuditTs,
  CATEGORY_OPTIONS,
} from "@/lib/auditFormat";

function StatCard({ icon, tone, label, value, sub }) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: tone.bg, color: tone.text }}
      >
        <CiIcon name={icon} size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 truncate text-xl font-bold text-gray-800">{value}</div>
        {sub && <div className="truncate text-[11px] text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function ActionCell({ action, category }) {
  const meta = categoryMeta(category);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: meta.color + "1a", color: meta.color }}
      >
        {meta.icon === "whatsapp" ? <WhatsAppIcon size={13} /> : <CiIcon name={meta.icon} size={13} strokeWidth={2} />}
      </span>
      <span className="font-semibold text-gray-800">{actionLabel(action)}</span>
    </span>
  );
}

function RelatedBadge({ entity }) {
  if (!entity?.id) return <span className="text-gray-300">—</span>;
  const tone = entityTone(entity.type);
  const type = String(entity.type || "id");
  const label = `${type.charAt(0).toUpperCase()}${type.slice(1)} #${entity.id}`;
  return (
    <span className="badge font-bold" style={{ background: tone.bg, color: tone.text }}>
      {label}
    </span>
  );
}

function StatusPill({ success }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
        success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-danger"
      }`}
    >
      {success ? "OK" : "Failed"}
    </span>
  );
}

function NewIpBadge({ entry }) {
  if (entry.action !== "login" || !entry.meta?.new_ip) return null;
  const title = entry.meta?.previous_ip
    ? `Previous login was from ${entry.meta.previous_ip}`
    : "Different IP than this user's last login";
  return (
    <span
      title={title}
      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700"
    >
      New IP
    </span>
  );
}

function EntryDetailModal({ entry, onClose }) {
  if (!entry) return null;
  const fields = [
    ["When", fmtAuditTs(entry.ts)],
    ["Employee", entry.actor?.name || "—"],
    ["Username", entry.actor?.username || "—"],
    ["Roles", (entry.actor?.roles || []).join(", ") || "—"],
    ["Action", actionLabel(entry.action)],
    ["Category", entry.category || "—"],
    ["Related To", entry.entity?.id ? `${entry.entity.type || "id"} #${entry.entity.id}` : "—"],
    [
      "IP Address",
      <span key="ip" className="inline-flex items-center gap-1.5">
        {entry.ip || "—"}
        <NewIpBadge entry={entry} />
      </span>,
    ],
    ["Status", entry.success ? "OK" : "Failed"],
  ];
  return (
    <Modal open onClose={onClose} title="Activity Details" size="md">
      <div className="space-y-2">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-sm last:border-0">
            <span className="shrink-0 text-gray-500">{k}</span>
            <span className="text-right font-semibold text-gray-800">{v}</span>
          </div>
        ))}
        {Object.keys(entry.meta || {}).length > 0 && (
          <div className="pt-1">
            <div className="mb-1.5 text-sm text-gray-500">Meta</div>
            <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-xs text-gray-700">
              {JSON.stringify(entry.meta, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

function EntryCard({ entry, onViewDetails }) {
  return (
    <div className="rounded-xl border border-line p-4 transition hover:border-accent/40 hover:shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: avatarColor(entry.actor?.username || entry.actor?.name) }}
          >
            {initials(entry.actor?.name || entry.actor?.username)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-gray-800">
              {entry.actor?.name || entry.actor?.username || "—"}
            </div>
            <div className="truncate text-[11px] text-gray-400">{entry.actor?.username || ""}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onViewDetails(entry)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-surface hover:text-gray-700"
          aria-label="View details"
        >
          <CiIcon name="dots" size={14} />
        </button>
      </div>
      <ActionCell action={entry.action} category={entry.category} />
      <p className="mt-2 truncate text-xs text-gray-500" title={metaSummary(entry)}>
        {metaSummary(entry)}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <RelatedBadge entity={entry.entity} />
        <StatusPill success={entry.success} />
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[10.5px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          {entry.ip || "—"}
          <NewIpBadge entry={entry} />
        </span>
        <span>{fmtAuditTs(entry.ts)}</span>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(null);

  const [actors, setActors] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ employeeId: "", category: "", from: "", to: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [view, setView] = useState("list"); // "list" | "grid"
  const [detailEntry, setDetailEntry] = useState(null);

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
    setCheckingAccess(false);

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.employeeId) qs.set("employeeId", filters.employeeId);
    if (filters.category) qs.set("category", filters.category);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    if (filters.search) qs.set("search", filters.search);

    const [actorsRes, auditRes, statsRes] = await Promise.all([
      clientFetch("/api/audit/actors"),
      clientFetch(`/api/audit?${qs.toString()}`),
      clientFetch("/api/audit?mode=stats"),
    ]);

    if (!auditRes.ok || !auditRes.data?.success) {
      setError(auditRes.data?.message || "Could not load the audit log.");
      setLoading(false);
      return;
    }

    if (actorsRes.ok && actorsRes.data?.success) setActors(actorsRes.data.actors ?? []);
    if (statsRes.ok && statsRes.data?.success) setStats(statsRes.data.stats ?? null);
    setRows(auditRes.data.entries ?? []);
    setTotal(auditRes.data.total ?? 0);
    setLoading(false);
  }, [router, page, limit, filters]);

  useEffect(() => {
    load();
  }, [load]);

  /* Debounce the free-text search so every keystroke doesn't fire a request */
  useEffect(() => {
    const t = setTimeout(() => updateFilter("search", searchInput.trim()), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function resetFilters() {
    setPage(1);
    setSearchInput("");
    setFilters({ employeeId: "", category: "", from: "", to: "", search: "" });
  }

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (filters.employeeId) qs.set("employeeId", filters.employeeId);
    if (filters.category) qs.set("category", filters.category);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    if (filters.search) qs.set("search", filters.search);
    return `/api/audit/export${qs.toString() ? "?" + qs.toString() : ""}`;
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (checkingAccess || !allowed) return <PageLoader label="Loading audit log…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-7xl pb-16">
      {/* Back link */}
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline">
        <CiIcon name="back" size={14} strokeWidth={2} />
        Back
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-gray-800">Audit Log</h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light text-accent-dark">
              <CiIcon name="shield" size={14} strokeWidth={2} />
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Track every activity performed by employees across the CRM.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
          <CiIcon name="lock" size={12} strokeWidth={2.5} />
          Admin Only
        </span>
      </div>

      {/* Filters */}
      <div className="card mb-5 flex flex-wrap items-end gap-3.5 p-4">
        <div className="min-w-[240px] flex-1">
          <label className="label">Search</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <CiIcon name="search" size={15} strokeWidth={2} />
            </span>
            <input
              type="text"
              className="input pl-9"
              placeholder="Search by lead ID, loan no., name, action or any word…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Employee</label>
          <select className="input !w-auto" value={filters.employeeId} onChange={(e) => updateFilter("employeeId", e.target.value)}>
            <option value="">All employees</option>
            {actors.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input !w-auto" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input !w-auto" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input !w-auto" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            <CiIcon name="refresh" size={14} strokeWidth={2} />
            Reset
          </button>
          <button type="button" className="btn-primary" onClick={load}>
            <CiIcon name="filter" size={14} strokeWidth={2} />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            icon="doc"
            tone={{ bg: "#f3e8fd", text: "#6d28d9" }}
            label="Total Activities"
            value={stats.totalActivities.toLocaleString("en-IN")}
            sub="All time"
          />
          <StatCard
            icon="user"
            tone={{ bg: "#e6f6f4", text: "#0c7a70" }}
            label="Employees"
            value={stats.activeEmployees.toLocaleString("en-IN")}
            sub="Active"
          />
          <StatCard
            icon="list"
            tone={{ bg: "#eef6fd", text: "#2563a8" }}
            label="Categories"
            value={stats.actionTypes.toLocaleString("en-IN")}
            sub="Action types"
          />
          <StatCard
            icon="cal"
            tone={{ bg: "#fdf1e3", text: "#c2650f" }}
            label="Today's Activities"
            value={stats.todayActivities.toLocaleString("en-IN")}
            sub={fmtAuditTs(new Date().toISOString()).split(",")[0]}
          />
        </div>
      )}

      {/* Records */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display text-base font-semibold text-gray-800">Audit Records</h3>
            <span className="badge bg-accent-light font-bold text-accent-dark">{total.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={exportHref} className="btn-secondary">
              <CiIcon name="download" size={14} strokeWidth={2} />
              Export
            </a>
            <span className="mx-0.5 h-6 w-px bg-line" />
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                title="List view"
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  view === "list" ? "bg-white text-accent-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <CiIcon name="list" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                title="Grid view"
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  view === "grid" ? "bg-white text-accent-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <CiIcon name="grid" size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            {loading ? "Searching…" : "No activity found for these filters."}
          </div>
        ) : view === "grid" ? (
          <div className={`grid grid-cols-1 gap-3 p-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : ""}`}>
            {rows.map((entry, i) => (
              <EntryCard key={i} entry={entry} onViewDetails={setDetailEntry} />
            ))}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="th whitespace-nowrap">When</th>
                  <th className="th">Employee</th>
                  <th className="th">Action</th>
                  <th className="th">Details</th>
                  <th className="th">Related To</th>
                  <th className="th">IP Address</th>
                  <th className="th text-center">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {rows.map((entry, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                    <td className="td whitespace-nowrap text-gray-500">{fmtAuditTs(entry.ts)}</td>
                    <td className="td">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: avatarColor(entry.actor?.username || entry.actor?.name) }}
                        >
                          {initials(entry.actor?.name || entry.actor?.username)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-800">
                            {entry.actor?.name || entry.actor?.username || "—"}
                          </span>
                          <span className="block truncate text-[11px] text-gray-400">{entry.actor?.username || ""}</span>
                        </span>
                      </span>
                    </td>
                    <td className="td whitespace-nowrap">
                      <ActionCell action={entry.action} category={entry.category} />
                    </td>
                    <td className="td max-w-[280px] truncate text-xs text-gray-600" title={metaSummary(entry)}>
                      {metaSummary(entry)}
                    </td>
                    <td className="td whitespace-nowrap">
                      <RelatedBadge entity={entry.entity} />
                    </td>
                    <td className="td whitespace-nowrap text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        {entry.ip || "—"}
                        <NewIpBadge entry={entry} />
                      </span>
                    </td>
                    <td className="td text-center">
                      <StatusPill success={entry.success} />
                    </td>
                    <td className="td text-right">
                      <button
                        type="button"
                        onClick={() => setDetailEntry(entry)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-surface hover:text-gray-700"
                        aria-label="View details"
                      >
                        <CiIcon name="dots" size={14} />
                      </button>
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

      <EntryDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
    </div>
  );
}
