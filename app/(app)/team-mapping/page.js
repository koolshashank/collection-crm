"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

function EmployeeCard({ employee, onDragStart, tone = "default" }) {
  const toneClass =
    tone === "tl"
      ? "border-accent-light bg-accent-light/40"
      : "border-line bg-white hover:border-accent-light hover:bg-accent-light/20";
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee.id)}
      className={`mb-2 cursor-grab rounded-lg border px-3 py-2 text-sm active:cursor-grabbing ${toneClass}`}
    >
      <div className="font-semibold text-gray-800">{employee.name}</div>
      {employee.designation && <div className="text-xs text-gray-400">{employee.designation}</div>}
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
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Team Mapping</h1>
          <p className="mt-1 text-sm text-gray-500">Drag staff onto a Team Leader to map them, or back to the list to unmap</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className={view === "manage" ? "btn-primary" : "btn-secondary"}
            onClick={() => setView("manage")}
          >
            Manage
          </button>
          <button
            type="button"
            className={view === "tree" ? "btn-primary" : "btn-secondary"}
            onClick={() => setView("tree")}
          >
            View Tree
          </button>
          <Link href="/dashboard" className="btn-secondary">
            ‹ Back
          </Link>
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
          <div
            className={`card min-h-[300px] overflow-hidden border-2 border-dashed transition-colors ${
              dragOverZone === "unmapped" ? "border-accent bg-accent-light/20" : "border-transparent"
            }`}
            onDragOver={allowDrop("unmapped")}
            onDragLeave={() => setDragOverZone((z) => (z === "unmapped" ? null : z))}
            onDrop={dropToUnmapped}
          >
            <div className="border-b border-line bg-surface px-5 py-4">
              <div className="font-display text-sm font-bold text-gray-800">Staff</div>
              <div className="mt-0.5 text-xs text-gray-500">{unmapped.length} unmapped</div>
            </div>
            <div className="p-4">
              {unmapped.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">Everyone is mapped or a team leader.</div>
              ) : (
                unmapped.map((emp) => <EmployeeCard key={emp.id} employee={emp} onDragStart={onDragStart} />)
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`flex items-center justify-center rounded-xl border-2 border-dashed px-5 py-4 text-sm font-semibold transition-colors ${
                dragOverZone === "make-tl"
                  ? "border-accent bg-accent-light/30 text-accent-dark"
                  : "border-line text-gray-400"
              }`}
              onDragOver={allowDrop("make-tl")}
              onDragLeave={() => setDragOverZone((z) => (z === "make-tl" ? null : z))}
              onDrop={dropToMakeTl}
            >
              ⬇ Drop a staff member here to make them a Team Leader
            </div>

            {tlIds.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-400">No team leaders yet.</div>
            ) : (
              tlIds.map((tlId) => {
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
                      className="flex cursor-grab items-center justify-between border-b border-line bg-accent-light/30 px-5 py-3 active:cursor-grabbing"
                    >
                      <div>
                        <div className="font-display text-sm font-bold text-accent-dark">{tl?.name || tlId}</div>
                        {tl?.designation && <div className="text-xs text-gray-500">{tl.designation}</div>}
                      </div>
                      <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-500">
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
