"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { CiIcon } from "@/components/client-info/icons";
import { avatarColor, initials } from "@/lib/avatarColor";
import LeadsPagination from "@/components/leads/LeadsPagination";

function fmtDate(ts) {
  if (!ts) return "--";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ icon, tone, label, value }) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: tone.bg, color: tone.text }}>
        <CiIcon name={icon} size={18} strokeWidth={2} />
      </span>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold" style={{ color: tone.text }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th className="th cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={active ? "text-accent-dark" : "text-gray-300"}>
          {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}

function HowItWorksModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How 2FA works" size="md" footer={<button className="btn-primary" onClick={onClose}>Got it</button>}>
      <div className="space-y-3 text-sm leading-relaxed text-gray-700">
        <p>
          When two-factor authentication is required, employees scan a QR code with an authenticator app (Google
          Authenticator, Authy, etc.) at their next login. The app then generates a 6-digit code that changes every
          30 seconds, which they enter alongside their password.
        </p>
        <p>
          <strong>Resetting</strong> a user's 2FA clears their stored authenticator secret. They'll be asked to scan
          a new QR code and set it up again — use this when someone loses or switches phones and can no longer
          generate valid codes.
        </p>
        <p className="text-xs text-gray-400">
          Whether 2FA is required at all is controlled separately, from the Security tab in System Settings.
        </p>
      </div>
    </Modal>
  );
}

function DetailModal({ emp, onClose }) {
  if (!emp) return null;
  const rows = [
    ["Name", emp.name],
    ["Designation", emp.designation || "--"],
    ["2FA Status", emp.twoFactorEnabled ? "Activated" : "Not Activated"],
    ["Last Activated", fmtDate(emp.activatedAt)],
    ["Employee ID", emp.id],
  ];
  return (
    <Modal open onClose={onClose} title="User Details" size="sm">
      <div className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm last:border-0">
            <span className="text-gray-500">{k}</span>
            <span className="text-right font-semibold text-gray-800">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function TwoFactorAdminPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState(null);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [detailEmp, setDetailEmp] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const isAdmin = (me.ok ? me.data?.user?.roles ?? [] : []).includes("ADMIN");
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const res = await clientFetch("/api/employees/2fa-status");
    if (!res.ok || !res.data?.success) {
      setError(res.data?.message || "Could not load the user list.");
      setLoading(false);
      return;
    }
    setEmployees(res.data.employees ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = employees;
    if (q) {
      list = list.filter(
        (e) => e.name?.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q)
      );
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let av, bv;
      if (sort.key === "status") {
        av = a.twoFactorEnabled ? 1 : 0;
        bv = b.twoFactorEnabled ? 1 : 0;
      } else if (sort.key === "activatedAt") {
        av = a.activatedAt || "";
        bv = b.activatedAt || "";
      } else {
        av = (a[sort.key] || "").toString().toLowerCase();
        bv = (b[sort.key] || "").toString().toLowerCase();
      }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }, [employees, search, sort]);

  useEffect(() => setPage(1), [search, sort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const enabledCount = useMemo(() => employees.filter((e) => e.twoFactorEnabled).length, [employees]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  async function resetTwoFactor(emp) {
    if (!window.confirm(`Reset 2FA for ${emp.name}? They will need to set up their authenticator app again.`)) {
      return;
    }
    setResettingId(emp.id);
    const res = await postJson("/api/employees/2fa-status/reset", { userId: emp.id, userName: emp.name });
    setResettingId(null);
    setMenuOpenId(null);
    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.message || "Could not reset 2FA — please try again.");
      return;
    }
    toast.success(res.data.message || "2FA has been reset.");
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, twoFactorEnabled: false, activatedAt: null } : e)));
  }

  function exportCsv() {
    const rows = [
      ["Name", "Designation", "2FA Status", "Last Activated"],
      ...filtered.map((e) => [e.name, e.designation || "--", e.twoFactorEnabled ? "Activated" : "Not Activated", fmtDate(e.activatedAt)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "two_factor_status.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !allowed) return <PageLoader label="Loading 2FA status…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark hover:underline">
            <CiIcon name="back" size={13} strokeWidth={2} />
            Back to Settings
          </Link>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Admin Only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => setHowItWorksOpen(true)}>
            <span className="text-accent">ⓘ</span>
            How 2FA works
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            <CiIcon name="back" size={13} strokeWidth={2} />
            Back
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-light text-accent-dark">
          <CiIcon name="shield" size={20} strokeWidth={2} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Two-Factor Authentication</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            See who has set up their authenticator app, and reset it for anyone who needs to set it up again on a new phone.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard icon="users" tone={{ bg: "#f3e8fd", text: "#6d28d9" }} label="Total Users" value={employees.length} />
        <StatCard icon="check" tone={{ bg: "#e6f6f4", text: "#0c7a70" }} label="Activated" value={enabledCount} />
        <StatCard icon="x" tone={{ bg: "#fdf1f0", text: "#c0392b" }} label="Not Activated" value={employees.length - enabledCount} />
      </div>

      {/* Search + Export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <CiIcon name="search" size={14} strokeWidth={2} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or designation…"
            className="input pl-9"
          />
        </div>
        <button type="button" className="btn-secondary" onClick={exportCsv}>
          <CiIcon name="download" size={14} strokeWidth={2} />
          Export
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <SortHeader label="Name" sortKey="name" sort={sort} onSort={toggleSort} />
                <SortHeader label="Designation" sortKey="designation" sort={sort} onSort={toggleSort} />
                <SortHeader label="2FA Status" sortKey="status" sort={sort} onSort={toggleSort} />
                <SortHeader label="Last Activated" sortKey="activatedAt" sort={sort} onSort={toggleSort} />
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                pageRows.map((emp) => (
                  <tr key={emp.id} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                    <td className="td">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: avatarColor(emp.name) }}
                        >
                          {initials(emp.name)}
                        </span>
                        <span className="font-semibold text-gray-800">{emp.name}</span>
                      </span>
                    </td>
                    <td className="td text-gray-500">{emp.designation || "--"}</td>
                    <td className="td">
                      {emp.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Activated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          Not Activated
                        </span>
                      )}
                    </td>
                    <td className="td whitespace-nowrap text-gray-500">{fmtDate(emp.activatedAt)}</td>
                    <td className="relative td text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => resetTwoFactor(emp)}
                          disabled={resettingId === emp.id}
                          className="btn-secondary !py-1.5 text-xs disabled:pointer-events-none disabled:opacity-60"
                        >
                          <CiIcon name="refresh" size={12} strokeWidth={2} />
                          {resettingId === emp.id ? "Resetting…" : "Reset 2FA"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === emp.id ? null : emp.id))}
                          onBlur={() => setTimeout(() => setMenuOpenId(null), 150)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-surface hover:text-gray-700"
                          aria-label="Row actions"
                        >
                          <CiIcon name="dots" size={14} strokeWidth={2} />
                        </button>
                      </div>
                      {menuOpenId === emp.id && (
                        <div className="absolute right-5 top-11 z-10 w-40 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDetailEmp(emp);
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-gray-700 hover:bg-surface"
                          >
                            <CiIcon name="eye" size={13} strokeWidth={2} className="text-gray-400" />
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <LeadsPagination
          currentPage={page}
          totalPages={totalPages}
          total={filtered.length}
          limit={pageSize}
          onGotoPage={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
          onChangeLimit={(v) => setPageSize(Number(v))}
        />
      </div>

      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <DetailModal emp={detailEmp} onClose={() => setDetailEmp(null)} />
    </div>
  );
}
