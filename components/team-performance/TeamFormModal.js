"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

/**
 * Add/Edit team. `members` is a simple comma or newline separated list of
 * agent_name values — same strings the Leads page's "Agent" filter and
 * portfolio API's agent_name param expect. Keeping this as free text
 * (rather than a picker) since there's no agents-list endpoint to source
 * a dropdown from yet.
 */
export default function TeamFormModal({ open, onClose, team, onSaved, toast }) {
  const [name, setName] = useState("");
  const [leadName, setLeadName] = useState("");
  const [membersText, setMembersText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(team?.name || "");
    setLeadName(team?.lead_name || "");
    setMembersText((team?.members || []).join("\n"));
  }, [open, team]);

  async function handleSave() {
    const members = membersText
      .split(/[\n,]/)
      .map((m) => m.trim())
      .filter(Boolean);

    if (!name.trim()) return toast.error("Team name is required.");
    if (members.length === 0) return toast.error("Add at least one agent (one per line).");

    setSaving(true);
    const res = await fetch("/api/teams/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team?.id || null, name: name.trim(), lead_name: leadName.trim(), members }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (data.success) {
      toast.success(team?.id ? "Team updated!" : "Team created!");
      onSaved(data.teams);
      onClose();
    } else {
      toast.error(data.message || "Failed to save team.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team?.id ? "Edit Team" : "Add Team"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Team"}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label className="label">Team Name *</label>
          <input className="input" placeholder="e.g. Team 1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Team Lead</label>
          <input className="input" placeholder="e.g. Harshit" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
        </div>
        <div>
          <label className="label">Agents (one per line, use the exact agent_name)</label>
          <textarea
            className="input min-h-[120px]"
            placeholder={"agent1\nagent2\nagent3"}
            value={membersText}
            onChange={(e) => setMembersText(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">
            Use the same agent name shown in the Leads page's "Agent" column/filter — that's what performance is matched against.
          </p>
        </div>
      </div>
    </Modal>
  );
}
