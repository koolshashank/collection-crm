"use client";

import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "@/components/client-info/icons";
import { Panel, PanelHead } from "./shared";

/* Only "Assign Cases" and "View Overdue Cases" / "Download Report" map to
   real pages — this CRM has no manual case-creation flow, so that one
   surfaces an honest toast instead of a dead/misleading link. */
function ActionRow({ icon, tone, title, sub, href, onClick }) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tone.bg, color: tone.text }}>
        <CiIcon name={icon} size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.8rem] font-semibold text-gray-800">{title}</div>
        <div className="truncate text-[0.68rem] text-gray-400">{sub}</div>
      </div>
      <CiIcon name="back" size={13} strokeWidth={2} className="shrink-0 rotate-180 text-gray-300" />
    </>
  );
  const className = "flex items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-accent/5 sm:px-5";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={`w-full ${className}`}>
      {body}
    </button>
  );
}

export default function QuickActions() {
  const toast = useToast();

  return (
    <Panel>
      <PanelHead
        title={
          <>
            <CiIcon name="zap" size={14} strokeWidth={2} className="text-accent" />
            Quick Actions
          </>
        }
      />
      <ActionRow
        icon="plus"
        tone={{ bg: "#e6f6f4", text: "#0c7a70" }}
        title="Add Collection Case"
        sub="Create a new collection case"
        onClick={() => toast.error("Cases are created automatically from the loan portfolio — there's no manual add yet.")}
      />
      <ActionRow
        icon="users"
        tone={{ bg: "#eef6fd", text: "#2563a8" }}
        title="Assign Cases"
        sub="Assign cases to collectors"
        href="/assign-lead"
      />
      <ActionRow
        icon="warn"
        tone={{ bg: "#fdf1e3", text: "#c2650f" }}
        title="View Overdue Cases"
        sub="View all overdue cases"
        href="/leads"
      />
      <ActionRow
        icon="download"
        tone={{ bg: "#f3e8fd", text: "#6d28d9" }}
        title="Download Report"
        sub="Download collection report"
        href="/collection"
      />
    </Panel>
  );
}
