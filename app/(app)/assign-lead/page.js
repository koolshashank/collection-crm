"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState, PageHeader } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";
import BulkUploadPanel from "@/components/assign-lead/BulkUploadPanel";
import RoundRobinCard from "@/components/assign-lead/RoundRobinCard";
import BulkAssignBar from "@/components/assign-lead/BulkAssignBar";
import LeadsTable from "@/components/assign-lead/LeadsTable";
import { extractEmpList } from "@/components/assign-lead/format";

const LIMIT = 10; // same page size as assign_lead.php

function AssignLeadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const search = (searchParams.get("search") || "").trim();

  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [rowStatus, setRowStatus] = useState({}); // leadId -> "loading" | "done"
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const empLoaded = useRef(false);
  const bulkPanelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await clientFetch("/api/config/round-robin");
      if (!cancelled && res.ok && res.data?.success) {
        setRoundRobinEnabled(Boolean(res.data.config?.enabled ?? true));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    const qs = new URLSearchParams();
    if (search !== "") qs.set("search", search);
    else {
      qs.set("page", String(page));
      qs.set("limit", String(LIMIT));
    }

    const jobs = [clientFetch(`/api/assign/unassigned?${qs.toString()}`)];
    if (!empLoaded.current) jobs.push(clientFetch("/api/ptp/emp-list"));
    const [listRes, empRes] = await Promise.all(jobs);

    if (empRes) {
      if (empRes.ok && empRes.data) {
        setEmployees(extractEmpList(empRes.data));
        empLoaded.current = true;
      } else {
        setEmployees([]);
      }
    }

    if (!listRes.ok || !listRes.data || listRes.data.success === false) {
      const msg = listRes.data?.message || listRes.error || "Could not load unassigned leads.";
      setLeads([]);
      setPagination({ currentPage: page, totalPages: 1, totalItems: 0 });
      setError(msg);
    } else {
      const data = listRes.data;
      const list = Array.isArray(data.leads) ? data.leads : [];
      setLeads(list);
      setPagination({
        currentPage: data.pagination?.currentPage ?? page,
        totalPages: data.pagination?.totalPages ?? 1,
        totalItems: data.pagination?.totalItems ?? list.length,
      });
      if (data.warning) setWarning(data.warning);
    }
    setSelected(new Set());
    setRowStatus({});
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  function navigate({ page: p, search: s }) {
    const qs = new URLSearchParams();
    const nextSearch = s !== undefined ? s : search;
    if (nextSearch) qs.set("search", nextSearch);
    if (p && p > 1) qs.set("page", String(p));
    router.push(`/assign-lead${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  function toggleRow(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll(checked) {
    if (!checked) return setSelected(new Set());
    const keys = leads
      .map((r) => String(r.lead_id ?? r.id ?? r.leadId ?? r.loan_id ?? ""))
      .filter((k) => k !== "" && rowStatus[k] !== "done");
    setSelected(new Set(keys));
  }

  /* Single assign — same field names as process_assign.php:
     loan_ids = lead id, assignTo = employee id */
  async function singleAssign(leadKey, agentId) {
    setRowStatus((m) => ({ ...m, [leadKey]: "loading" }));
    const fd = new FormData();
    fd.append("loan_ids", leadKey);
    fd.append("assignTo", agentId);
    const res = await clientFetch("/api/assign/process", { method: "POST", body: fd });
    if (res.ok && res.data?.success) {
      success(res.data.message || "Lead assigned successfully ✓");
      setRowStatus((m) => ({ ...m, [leadKey]: "done" }));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(leadKey);
        return next;
      });
    } else {
      toastError(res.data?.message || res.error || "Assignment failed. Try again.");
      setRowStatus((m) => {
        const { [leadKey]: _drop, ...rest } = m;
        return rest;
      });
    }
  }

  /* Bulk assign — loan_ids[] array + assignTo, same as the PHP bulk form */
  async function bulkAssign(agentId) {
    setBulkSubmitting(true);
    const fd = new FormData();
    selected.forEach((id) => fd.append("loan_ids[]", id));
    fd.append("assignTo", agentId);
    const res = await clientFetch("/api/assign/process", { method: "POST", body: fd });
    setBulkSubmitting(false);
    if (res.ok && res.data?.success) {
      success(res.data.message || `${selected.size} lead(s) assigned successfully`);
      load();
    } else {
      toastError(res.data?.message || res.error || "Assignment failed. Try again.");
    }
  }

  const total = Number(pagination.totalItems) || 0;
  const totalPages = Number(pagination.totalPages) || 1;
  const currentPage = Number(pagination.currentPage) || page;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/leads"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition hover:text-accent-dark"
          >
            <CiIcon name="back" size={12} strokeWidth={2.5} />
            All Leads
          </Link>
        }
        title="Assign Leads"
        subtitle="Assign unallocated loan accounts to collection executives"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={load}>
              <CiIcon name="refresh" size={14} strokeWidth={2.2} />
              Refresh
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setBulkPanelOpen(true);
                requestAnimationFrame(() =>
                  bulkPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }}
            >
              <CiIcon name="download" size={14} strokeWidth={2.2} />
              Bulk CSV Upload
            </button>
          </>
        }
      />

      {warning && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border-[1.5px] border-amber bg-amber/10 px-4 py-3.5">
          <span className="mt-0.5 text-amber">⚠</span>
          <div>
            <div className="text-sm font-bold text-amber">Leads list couldn&apos;t load properly</div>
            <div className="mt-0.5 text-xs leading-relaxed text-gray-600">{warning}</div>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
            <CiIcon name="users" size={19} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">Unassigned Leads</p>
            <p className="truncate text-xl font-bold text-gray-800">{total.toLocaleString("en-IN")}</p>
            <p className="truncate text-[11px] text-gray-400">Loan accounts waiting for an agent</p>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3b6ea51a] text-info">
            <CiIcon name="headset" size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">Available Agents</p>
            <p className="truncate text-xl font-bold text-gray-800">{employees.length.toLocaleString("en-IN")}</p>
            <p className="truncate text-[11px] text-gray-400">Employees who can receive leads</p>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed1a] text-[#7c3aed]">
            <CiIcon name="cal" size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Pages</p>
            <p className="truncate text-xl font-bold text-gray-800">{totalPages.toLocaleString("en-IN")}</p>
            <p className="truncate text-[11px] text-gray-400">{LIMIT} leads shown per page</p>
          </div>
        </div>
      </div>

      {/* Bulk CSV Upload */}
      <div ref={bulkPanelRef}>
        <BulkUploadPanel open={bulkPanelOpen} onToggle={setBulkPanelOpen} onUploaded={load} />
      </div>

      {/* Toolbar / search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ page: 1, search: searchInput.trim() });
        }}
      >
        <div className="card mb-4 flex flex-wrap items-center gap-2.5 p-3.5">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <CiIcon name="search" size={16} strokeWidth={2} />
            </span>
            <input
              type="text"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, loan ID, mobile…"
              className="input w-full pl-9"
            />
          </div>
          <div className="hidden h-7 w-px shrink-0 bg-line sm:block" />
          <button type="submit" className="btn-primary">
            <CiIcon name="search" size={14} strokeWidth={2.2} />
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchInput("");
                navigate({ page: 1, search: "" });
              }}
            >
              <CiIcon name="x" size={14} strokeWidth={2.2} />
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Bulk Assign Bar */}
      <BulkAssignBar
        selectedCount={selected.size}
        employees={employees}
        submitting={bulkSubmitting}
        onAssign={bulkAssign}
        onDeselectAll={() => setSelected(new Set())}
      />

      {/* Round Robin Distribution — hidden when an admin has turned it off in Settings */}
      {roundRobinEnabled ? (
        <RoundRobinCard onDistributed={load} />
      ) : (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-amber bg-amber/10 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-amber">
              <CiIcon name="warn" size={16} strokeWidth={2} />
            </span>
            <div>
              <div className="text-sm font-bold text-amber">Round Robin Distribution is off</div>
              <div className="mt-0.5 text-xs leading-relaxed text-gray-600">
                Leads must be assigned manually below. An admin can re-enable auto-distribution from Settings.
              </div>
            </div>
          </div>
          <Link
            href="/settings"
            title="Open Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber/40 text-amber transition hover:bg-amber/10"
          >
            <CiIcon name="settings" size={15} strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card">
          <PageLoader label="Loading unassigned leads…" />
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          employees={employees}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          search={search}
          selected={selected}
          rowStatus={rowStatus}
          onToggle={toggleRow}
          onToggleAll={toggleAll}
          onSingleAssign={singleAssign}
          onGoToPage={(p) => navigate({ page: p })}
        />
      )}
    </>
  );
}

export default function AssignLeadPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AssignLeadContent />
    </Suspense>
  );
}
