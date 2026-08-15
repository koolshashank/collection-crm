"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";

/**
 * Assign a new field visit.
 *
 * The agent dropdown reuses the same source the existing "Assign to Field"
 * modals use (settlement_action.php?action=get_emp_list), so the agent list
 * stays consistent across the app.
 */
export default function AssignVisitModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const agentsLoaded = useRef(false);
  const [agents, setAgents] = useState([]);
  const [agentHint, setAgentHint] = useState("Loading agents…");
  const [saving, setSaving] = useState(false);

  const empty = {
    lead_id: "",
    loan_id: "",
    customer_name: "",
    mobile: "",
    address: "",
    agent_id: "",
    visit_date: "",
    priority: "normal",
    notes: "",
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setForm({ ...empty, visit_date: new Date().toISOString().split("T")[0] });
    if (!agentsLoaded.current) loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadAgents() {
    const res = await clientFetch("/api/settlement/action?action=get_emp_list");
    if (res.status === 0 || (!res.ok && !res.data)) {
      setAgentHint("Could not load agents — you can still type an agent name below.");
      return;
    }
    const d = res.data || {};
    const list = d.data || d.result || d.employees || [];
    if (list.length) {
      setAgents(list);
      setAgentHint(`${list.length} agents available`);
      agentsLoaded.current = true;
    } else {
      setAgentHint("No agents found");
    }
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.agent_id || !form.visit_date) {
      return toast.error("Select an agent and a visit date.");
    }
    if (!form.lead_id.trim() && !form.loan_id.trim()) {
      return toast.error("Enter a Lead ID or Loan ID.");
    }

    const selected = agents.find(
      (a) => String(a.id ?? a.emp_id ?? a.employee_id) === String(form.agent_id)
    );
    const agentName = selected
      ? `${selected.f_name ?? selected.first_name ?? ""} ${selected.l_name ?? selected.last_name ?? ""}`.trim() ||
        selected.name ||
        String(form.agent_id)
      : String(form.agent_id);

    setSaving(true);
    const res = await postJson("/api/field-visits", { ...form, agent_name: agentName });
    setSaving(false);

    if (res.data?.success) {
      toast.success("Field visit assigned!");
      onSaved?.();
      onClose();
    } else {
      toast.error(res.data?.message || "Could not assign the visit.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Field Visit"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Assigning…" : "Assign Visit"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label className="label">Lead ID</label>
          <input className="input" value={form.lead_id} onChange={(e) => set("lead_id", e.target.value)} />
        </div>
        <div>
          <label className="label">Loan ID</label>
          <input className="input" value={form.loan_id} onChange={(e) => set("loan_id", e.target.value)} />
        </div>
        <div>
          <label className="label">Customer Name</label>
          <input
            className="input"
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Mobile</label>
          <input className="input" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>

        <div>
          <label className="label">Assign To *</label>
          <select className="input" value={form.agent_id} onChange={(e) => set("agent_id", e.target.value)}>
            <option value="">Select agent…</option>
            {agents.map((a) => {
              const id = a.id ?? a.emp_id ?? a.employee_id;
              const nm =
                `${a.f_name ?? a.first_name ?? ""} ${a.l_name ?? a.last_name ?? ""}`.trim() ||
                a.name ||
                String(id);
              return (
                <option key={id} value={id}>
                  {nm}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-gray-400">{agentHint}</p>
        </div>

        <div>
          <label className="label">Visit Date *</label>
          <input
            type="date"
            className="input"
            value={form.visit_date}
            onChange={(e) => set("visit_date", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px]"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything the agent should know before the visit…"
          />
        </div>
      </div>
    </Modal>
  );
}
