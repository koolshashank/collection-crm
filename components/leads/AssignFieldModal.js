"use client";

import { useEffect, useState } from "react";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { useToast } from "@/components/ui/Toast";

export default function AssignFieldModal({ lead, onClose }) {
  const toast = useToast();
  const [agents, setAgents] = useState([]);
  const [agentHint, setAgentHint] = useState("Loading agents…");
  const [agentId, setAgentId] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* lpLoadAgents — same endpoint & response fallbacks */
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch("/api/settlement/action?action=get_emp_list");
      if (!alive) return;
      if (!res.ok || !res.data) {
        setAgentHint("Could not load agents");
        return;
      }
      const list = res.data.data || res.data.result || res.data.employees || [];
      if (list.length) {
        setAgents(list);
        setAgentHint(list.length + " agents available");
      } else {
        setAgentHint("No agents found");
      }
    })();
    return () => { alive = false; };
  }, []);

  /* lpSubmitAssign — identical validation & payload param names */
  const submit = async () => {
    if (!agentId || !visitDate) return toast.error("Select an agent and visit date");
    setSaving(true);
    const res = await postJson("/api/leads/assign-field", {
      lead_id: lead.leadId,
      loan_id: lead.loanId,
      agent_id: agentId,
      visit_date: visitDate,
      priority,
      notes: note,
    });
    setSaving(false);
    if (res.status === 0) return toast.error("Network error — please try again");
    if (res.data?.success) {
      toast.success("Assigned to field agent successfully");
      onClose();
    } else {
      toast.error(res.data?.message || "Assignment failed");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-display text-base font-semibold text-gray-800">Assign to Field Agent</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {lead.name}{lead.loanId ? ` — ${lead.loanId}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-5">
          <div>
            <label className="label mb-1 block">Field Agent <span className="text-danger">*</span></label>
            <select className="input w-full" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">— Select Agent —</option>
              {agents.map((a, i) => (
                <option key={i} value={a.emp_id || a.id || ""}>
                  {(a.emp_name || a.name || "") + (a.designation ? ` — ${a.designation}` : "")}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">{agentHint}</p>
          </div>
          <div>
            <label className="label mb-1 block">Visit Date <span className="text-danger">*</span></label>
            <input type="date" className="input w-full" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div>
            <label className="label mb-1 block">Priority</label>
            <select className="input w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label mb-1 block">Instructions</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Optional instructions for the field agent"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
