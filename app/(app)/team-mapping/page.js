"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";
import { avatarColor, initials } from "@/lib/avatarColor";

function Avatar({ name }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  );
}

function EmployeeCard({ employee, onDragStart, tone = "default" }) {
  const toneClass =
    tone === "tl"
      ? "border-accent-light bg-accent-light/40"
      : "border-line bg-white hover:border-accent-light hover:bg-accent-light/20";
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee.id)}
      className={`mb-2 flex cursor-grab items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition active:cursor-grabbing ${toneClass}`}
    >
      <CiIcon name="grip" size={13} strokeWidth={2} className="shrink-0 text-gray-300" />
      <Avatar name={employee.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-gray-800">{employee.name}</div>
        {employee.designation && <div className="truncate text-xs text-gray-400">{employee.designation}</div>}
      </div>
    </div>
  );
}

export default function TeamMappingPage() {
  const router = useRouter();
  const { error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [tlIds, setTlIds] = useState([]);
  const [mapping, setMapping] = useState({});
  const [view, setView] = useState("manage"); // "manage" | "tree"
  const [dragOverZone, setDragOverZone] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    const isAdmin = roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD");
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const [empRes, mapRes] = await Promise.all([
      clientFetch("/api/employees/list"),
      clientFetch("/api/team-mapping"),
    ]);

    if (!mapRes.ok || !mapRes.data?.success) {
      setError(mapRes.data?.message || "Could not load team mapping.");
      setLoading(false);
      return;
    }

    setEmployees(empRes.ok && empRes.data?.success ? empRes.data.employees : []);
    setTlIds(mapRes.data.tlIds ?? []);
    setMapping(mapRes.data.mapping ?? {});
    if (!empRes.ok || !empRes.data?.success) {
      toastError(empRes.data?.message || "Could not load employee list.");
    }
    setLoading(false);
  }, [router, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const mappedIds = useMemo(() => new Set(Object.values(mapping).flat()), [mapping]);
  const tlSet = useMemo(() => new Set(tlIds), [tlIds]);
  const unmapped = useMemo(
    () => employees.filter((e) => !tlSet.has(e.id) && !mappedIds.has(e.id)),
    [employees, tlSet, mappedIds]
  );
  const visibleUnmapped = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unmapped;
    return unmapped.filter((e) => e.name?.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q));
  }, [unmapped, search]);

  function findCurrentTl(id) {
    for (const [tlId, members] of Object.entries(mapping)) {
      if (members.includes(id)) return tlId;
    }
    return null;
  }

  async function persist(nextTlIds, nextMapping) {
    const prevTlIds = tlIds;
    const prevMapping = mapping;
    setTlIds(nextTlIds);
    setMapping(nextMapping);
    const res = await postJson("/api/team-mapping", { tlIds: nextTlIds, mapping: nextMapping });
    if (!res.ok || !res.data?.success) {
      setTlIds(prevTlIds);
      setMapping(prevMapping);
      toastError(res.data?.message || "Could not save — change reverted");
    }
  }

  function onDragStart(e, id) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function allowDrop(zoneKey) {
    return (e) => {
      e.preventDefault();
      if (dragOverZone !== zoneKey) setDragOverZone(zoneKey);
    };
  }

  async function dropToUnmapped(e) {
    e.preventDefault();
    setDragOverZone(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    if (tlSet.has(id)) {
      const nextTlIds = tlIds.filter((t) => t !== id);
      const nextMapping = { ...mapping };
      delete nextMapping[id];
      await persist(nextTlIds, nextMapping);
      return;
    }
    const currentTl = findCurrentTl(id);
    if (currentTl) {
      const nextMapping = { ...mapping, [currentTl]: mapping[currentTl].filter((m) => m !== id) };
      await persist(tlIds, nextMapping);
    }
  }

  async function dropToMakeTl(e) {
    e.preventDefault();
    setDragOverZone(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id || tlSet.has(id)) return;

    const currentTl = findCurrentTl(id);
    const nextMapping = { ...mapping };
    if (currentTl) nextMapping[currentTl] = nextMapping[currentTl].filter((m) => m !== id);
    nextMapping[id] = [];
    await persist([...tlIds, id], nextMapping);
  }

  async function dropToTl(e, targetTlId) {
    e.preventDefault();
    setDragOverZone(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === targetTlId || tlSet.has(id)) return;

    const currentTl = findCurrentTl(id);
    if (currentTl === targetTlId) return;
    const nextMapping = { ...mapping };
    if (currentTl) nextMapping[currentTl] = nextMapping[currentTl].filter((m) => m !== id);
    nextMapping[targetTlId] = [...(nextMapping[targetTlId] || []), id];
    await persist(tlIds, nextMapping);
  }

  if (loading || !allowed) return <PageLoader label="Loading team mapping…" />;
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
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className={view === "manage" ? "btn-primary" : "btn-secondary"}
            onClick={() => setView("manage")}
          >
            <CiIcon name="users" size={14} strokeWidth={2} />
            Manage Team Leaders
          </button>
          <button
            type="button"
            className={view === "tree" ? "btn-primary" : "btn-secondary"}
            onClick={() => setView("tree")}
          >
            <CiIcon name="users" size={14} strokeWidth={2} />
            View Tree
          </button>
          <Link href="/dashboard" className="btn-secondary">
            <CiIcon name="back" size={13} strokeWidth={2} />
            Back
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-800">Team Mapping</h1>
        <p className="mt-1 text-sm text-gray-500">Drag staff onto a Team Leader to map them, or back to the list to unmap.</p>
      </div>

      {/* How it works */}
      <div className="card mb-5 flex items-start gap-3 border-accent-light bg-accent-light/30 px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-accent-dark">
          <CiIcon name="check" size={16} strokeWidth={2} />
        </span>
        <div>
          <div className="text-sm font-bold text-gray-800">How it works</div>
          <p className="mt-0.5 text-xs text-gray-500">
            Drag a staff member from the list and drop it under a Team Leader card to assign them. You can move them anytime.
          </p>
        </div>
      </div>

      {view === "tree" ? (
        <div className="card p-5">
          {tlIds.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No team leaders set up yet.</div>
          ) : (
            <ul className="space-y-4">
              {tlIds.map((tlId) => {
                const tl = employeeById.get(tlId);
                const members = mapping[tlId] || [];
                return (
                  <li key={tlId}>
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
                      <span className="text-accent">▾</span>
                      {tl?.name || tlId}
                      <span className="text-xs font-normal text-gray-400">
                        ({members.length} staff)
                      </span>
                    </div>
                    {members.length > 0 && (
                      <ul className="ml-6 mt-1.5 space-y-1 border-l border-line pl-4">
                        {members.map((mId) => {
                          const m = employeeById.get(mId);
                          return (
                            <li key={mId} className="text-sm text-gray-600">
                              {m?.name || mId}
                              {m?.designation && <span className="ml-1.5 text-xs text-gray-400">· {m.designation}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_2fr]">
          {/* ── Staff ── */}
          <div
            className={`card flex min-h-[420px] flex-col overflow-hidden border-2 border-dashed transition-colors ${
              dragOverZone === "unmapped" ? "border-accent bg-accent-light/20" : "border-transparent"
            }`}
            onDragOver={allowDrop("unmapped")}
            onDragLeave={() => setDragOverZone((z) => (z === "unmapped" ? null : z))}
            onDrop={dropToUnmapped}
          >
            <div className="border-b border-line bg-surface px-5 py-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
                <CiIcon name="user" size={15} strokeWidth={2} className="text-accent-dark" />
                Staff
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{unmapped.length} unmapped</div>
            </div>

            <div className="border-b border-line px-4 py-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <CiIcon name="search" size={14} strokeWidth={2} />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff…"
                  className="input pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {visibleUnmapped.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  {unmapped.length === 0 ? "Everyone is mapped or a team leader." : "No staff match your search."}
                </div>
              ) : (
                visibleUnmapped.map((emp) => <EmployeeCard key={emp.id} employee={emp} onDragStart={onDragStart} />)
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 border-t border-line bg-surface px-4 py-2.5 text-[11px] text-gray-400">
              <CiIcon name="check" size={11} strokeWidth={2} />
              Drag staff to a Team Leader
            </div>
          </div>

          {/* ── Team Leaders ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-gray-800">
                <CiIcon name="users" size={15} strokeWidth={2} className="text-accent-dark" />
                Team Leaders
              </div>
              <span className="badge bg-accent-light font-bold text-accent-dark">{tlIds.length} Total</span>
            </div>

            {tlIds.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors ${
                  dragOverZone === "make-tl" ? "border-accent bg-accent-light/20" : "border-line bg-surface/50"
                }`}
                onDragOver={allowDrop("make-tl")}
                onDragLeave={() => setDragOverZone((z) => (z === "make-tl" ? null : z))}
                onDrop={dropToMakeTl}
              >
                <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent-dark">
                  <CiIcon name="users" size={20} strokeWidth={2} />
                </span>
                <div className="text-sm font-bold text-gray-800">No team leaders yet</div>
                <p className="text-xs text-gray-400">Drag a staff member here to make them a Team Leader</p>
                <CiIcon name="arrowDown" size={16} strokeWidth={2} className="mt-1.5 text-gray-300" />
              </div>
            ) : (
              <>
                <div
                  className={`flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-5 py-3 text-xs font-semibold transition-colors ${
                    dragOverZone === "make-tl" ? "border-accent bg-accent-light/30 text-accent-dark" : "border-line text-gray-400"
                  }`}
                  onDragOver={allowDrop("make-tl")}
                  onDragLeave={() => setDragOverZone((z) => (z === "make-tl" ? null : z))}
                  onDrop={dropToMakeTl}
                >
                  <CiIcon name="arrowDown" size={13} strokeWidth={2} />
                  Drop a staff member here to make them a Team Leader
                </div>

                {tlIds.map((tlId) => {
                  const tl = employeeById.get(tlId);
                  const members = mapping[tlId] || [];
                  return (
                    <div
                      key={tlId}
                      className={`card overflow-hidden border-2 border-dashed transition-colors ${
                        dragOverZone === tlId ? "border-accent bg-accent-light/10" : "border-transparent"
                      }`}
                      onDragOver={allowDrop(tlId)}
                      onDragLeave={() => setDragOverZone((z) => (z === tlId ? null : z))}
                      onDrop={(e) => dropToTl(e, tlId)}
                    >
                      <div
                        draggable
                        onDragStart={(e) => onDragStart(e, tlId)}
                        title="Drag back to Staff to remove as Team Leader"
                        className="flex cursor-grab items-center justify-between gap-2.5 border-b border-line bg-accent-light/30 px-5 py-3 active:cursor-grabbing"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={tl?.name || tlId} />
                          <span className="min-w-0">
                            <span className="block truncate font-display text-sm font-bold text-accent-dark">{tl?.name || tlId}</span>
                            {tl?.designation && <span className="block truncate text-xs text-gray-500">{tl.designation}</span>}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-500">
                          {members.length} mapped
                        </span>
                      </div>
                      <div className="min-h-[70px] p-4">
                        {members.length === 0 ? (
                          <div className="py-3 text-center text-xs text-gray-400">Drop staff here to map them</div>
                        ) : (
                          members.map((mId) => {
                            const m = employeeById.get(mId);
                            return m ? (
                              <EmployeeCard key={mId} employee={m} onDragStart={onDragStart} tone="tl" />
                            ) : null;
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Tips */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CiIcon name="bulb" size={15} strokeWidth={2} />
                Tips
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-emerald-700">
                <li className="flex items-start gap-1.5">
                  <span className="mt-px shrink-0">✓</span>
                  You can drag multiple staff to the same Team Leader.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-px shrink-0">✓</span>
                  To unmap, drag the staff member back to the left list.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-px shrink-0">✓</span>
                  Changes are saved automatically.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
