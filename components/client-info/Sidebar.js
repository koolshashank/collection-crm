"use client";

import { CiIcon, WhatsAppIcon } from "./icons";
import { SectionCard, MiniRow } from "./SectionCard";
import { ciSafe } from "./helpers";
import ActivityTimeline from "./ActivityTimeline";

/**
 * Sidebar column — References, Assignment, Contact & Email,
 * Activity Timeline, Quick Actions. 1:1 port of the .ci-side-col cards.
 */
export default function Sidebar({ loan, leadId, priority, onQuickAction }) {
  /* Assignment fallbacks — verbatim from PHP */
  const agentName =
    loan.collection_assigned_to_agent_name ?? loan.agent_name ?? loan.emp_name ?? null;
  const allocBy =
    loan.collection_assigned_by_agent_name ?? loan.allocated_by ?? loan.assigned_by ?? null;
  const leadSrc = loan.lead_source ?? loan.source ?? null;
  const branch = loan.branch ?? loan.branch_name ?? null;

  const qaBtn =
    "flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-2 py-3.5 text-xs font-semibold text-gray-800 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md hover:shadow-accent/10 no-underline";

  return (
    <div className="flex flex-col">
      {/* References */}
      <SectionCard icon="users" title="References">
        {[1, 2].map((n) => (
          <div key={n} className="mb-1">
            <div className={`mb-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 ${n === 1 ? "" : "mt-3"}`}>
              Reference {n}
            </div>
            <MiniRow label="Name" value={ciSafe(loan[`reference_name_${n}`] ?? "")} />
            <MiniRow label="Relation" value={ciSafe(loan[`ref_relation_${n}`] ?? "")} />
            <MiniRow label="Contact" value={ciSafe(loan[`mobile_number_${n}`] ?? "")} />
          </div>
        ))}
      </SectionCard>

      {/* Assignment */}
      <SectionCard icon="users" title="Assignment">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-accent-light font-display text-lg font-bold text-accent-dark">
            {agentName ? String(agentName).trim().charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Assigned Agent</div>
            <div className="text-sm font-bold text-gray-800">{ciSafe(agentName || "Not Assigned")}</div>
          </div>
        </div>
        <MiniRow label="Allocated By" value={ciSafe(allocBy || "--")} />
        <MiniRow
          label="Collection Priority"
          value={
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
              style={{ color: priority.color, background: priority.bg, borderColor: "currentColor" }}
            >
              {priority.label}
            </span>
          }
        />
        <MiniRow label="Lead Source" value={ciSafe(leadSrc || "--")} />
        <MiniRow label="Branch" value={ciSafe(branch || "--")} />
      </SectionCard>

      {/* Contact & Email */}
      <SectionCard icon="mail" title="Contact & Email">
        <MiniRow label="Mobile" value={ciSafe(loan.mobile ?? "")} />
        <MiniRow label="Alt Mobile" value={ciSafe(loan.alternate_mobile ?? "")} />
        <MiniRow label="Personal Email" value={ciSafe(loan.personal_email ?? "")} />
        <MiniRow label="Office Email" value={ciSafe(loan.office_email ?? "")} />
      </SectionCard>

      {/* Activity Timeline */}
      <ActivityTimeline leadId={leadId} />

      {/* Quick Actions */}
      <SectionCard icon="zap" title="Quick Actions" bodyClassName="p-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button className={qaBtn} onClick={() => onQuickAction("allDocsModal")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent-dark">
              <CiIcon name="doc" size={17} />
            </div>
            <span>Documents</span>
          </button>
          <button className={qaBtn} onClick={() => onQuickAction("callModal")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5f0] text-[#1E7E5E]">
              <CiIcon name="phone" size={17} />
            </div>
            <span>Call</span>
          </button>
          <button className={qaBtn} onClick={() => onQuickAction("waModal")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9fbf0] text-[#1E7E5E]">
              <WhatsAppIcon size={17} />
            </div>
            <span>WhatsApp</span>
          </button>
          <button className={qaBtn} onClick={() => onQuickAction("assignModal")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3e8fd] text-[#7c3aed]">
              <CiIcon name="users" size={17} />
            </div>
            <span>Assign to Field</span>
          </button>
          <a href="#sec-ptp" className={qaBtn}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent-dark">
              <CiIcon name="cal" size={17} />
            </div>
            <span>View PTP</span>
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
