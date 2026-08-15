"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { CiIcon } from "./icons";

/**
 * Assign to Field Agent — port of lpOpenAssign()/lpLoadAgents()/lpSubmitAssign().
 * Agents load once per page (settlement_action.php?action=get_emp_list →
 * /api/settlement/action?action=get_emp_list). Submit posts to
 * assign_field.php → /api/leads/assign-field with an identical body.
 */
export default function AssignFieldModal({ open, onClose, loan, leadId }) {
  const toast = useToast();
  const agentsLoaded = useRef(false);
  const [agents, setAgents] = useState([]);
  const [hint, setHint] = useState("Loading agents…");
  const [agentId, setAgentId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const name = loan.full_name ?? "";
  const loanNo = loan.loan_no ?? "";

  useEffect(() => {
    if (!open) return;
    /* Same defaults as lpOpenAssign() */
    setVisitDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setPriority("normal");
    setAgentId("");
    if (!agentsLoaded.current) loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadAgents() {
    const res = await clientFetch("/api/settlement/action?action=get_emp_list");
    if (res.status === 0 || (!res.ok && !res.data)) {
      setHint("Could not load agents");
      return;
    }
    const d = res.data || {};
    const list = d.data || d.result || d.employees || [];
    if (list.length) {
      setAgents(list);
      setHint(`${list.length} agents available`);
      agentsLoaded.current = true;
    } else {
      setHint("No agents found");
    }
  }

  async function submitAssign() {
    if (!agentId || !visitDate) return toast.error("Select an agent and visit date");
    setSubmitting(true);
    const res = await postJson("/api/leads/assign-field", {
      lead_id: leadId,
      loan_id: loanNo,
      agent_id: agentId,
      visit_date: visitDate,
      priority,
      notes: note,
    });
    setSubmitting(false);
    if (res.status === 0) return toast.error("Network error, please try again");
    if (res.data?.success) {
      toast.success("Assigned to field agent successfully");
      onClose();
    } else {
      toast.error(res.data?.message || "Assignment failed");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span>
          Assign to Field Agent
          <span className="mt-0.5 block text-xs font-normal text-gray-500">
            {name}
            {loanNo ? ` · ${loanNo}` : ""}
          </span>
        </span>
      }
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submitAssign} disabled={submitting}>
            <CiIcon name="user" size={13} strokeWidth={2} />
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <label className="label">
            Field Agent <span className="text-danger">*</span>
          </label>
          <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">— Select Agent —</option>
            {agents.map((a, i) => (
              <option key={i} value={a.emp_id || a.id || ""}>
                {(a.emp_name || a.name || "") + (a.designation ? " · " + a.designation : "")}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-gray-500">{hint}</div>
        </div>
        <div>
          <label className="label">
            Visit Date <span className="text-danger">*</span>
          </label>
          <input type="date" className="input" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="label">Instructions</label>
          <input
            type="text"
            className="input"
            placeholder="Optional instructions for the field agent"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
