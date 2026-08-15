"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/Feedback";
import { PageLoader } from "@/components/ui/Spinner";
import TeamPerformanceCard from "@/components/team-performance/TeamPerformanceCard";
import TeamFormModal from "@/components/team-performance/TeamFormModal";

export default function TeamPerformancePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const rosterRes = await clientFetch("/api/teams/list");
    const roster = rosterRes.data?.teams || [];
    setRosterCount(roster.length);

    if (roster.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const perfRes = await clientFetch("/api/teams/performance");
    if (!perfRes.ok || !perfRes.data?.success) {
      setError(perfRes.data?.message || "Could not load team performance.");
      setTeams([]);
    } else {
      // Keep roster's lead_name/members alongside computed perf for the edit modal
      const merged = (perfRes.data.teams || []).map((p) => ({
        ...p,
        _roster: roster.find((r) => r.id === p.id),
      }));
      setTeams(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingTeam(null);
    setFormOpen(true);
  }

  function openEdit(team) {
    setEditingTeam(team._roster || team);
    setFormOpen(true);
  }

  async function handleDelete(team) {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    const res = await fetch("/api/teams/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      toast.success("Team deleted.");
      load();
    } else {
      toast.error(data.message || "Failed to delete team.");
    }
  }

  return (
    <>
      <PageHeader
        title="Team Performance"
        subtitle="Collection performance grouped by team — fresh vs reloan split, sanction totals"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={load}>
              Refresh
            </button>
            <button type="button" className="btn-primary" onClick={openAdd}>
              + Add Team
            </button>
          </div>
        }
      />

      {loading ? (
        <PageLoader label="Crunching team numbers…" />
      ) : rosterCount === 0 ? (
        <EmptyState
          icon="👥"
          title="No teams configured yet"
          hint='Click "+ Add Team" to group agents into a team and see their combined performance.'
        />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {teams.map((team) => (
            <TeamPerformanceCard key={team.id} team={team} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <TeamFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        team={editingTeam}
        toast={toast}
        onSaved={() => load()}
      />
    </>
  );
}
