"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { CiIcon, WhatsAppIcon } from "@/components/client-info/icons";
import {
  ciSafe,
  ciDate,
  ciInr,
  ciInitials,
  getStatusMeta,
  getPriority,
  getRoleFlags,
} from "@/components/client-info/helpers";
import ClosedCelebration from "@/components/client-info/ClosedCelebration";
import BlockPanModal from "@/components/client-info/BlockPanModal";
import PayLinkModal from "@/components/client-info/PayLinkModal";
import UpdatePaymentModal from "@/components/client-info/UpdatePaymentModal";
import CollectionLogsModal from "@/components/client-info/CollectionLogsModal";
import CallModal from "@/components/leads/CallModal";
import WhatsAppChatModal from "@/components/integrations/WhatsAppChatModal";
import UpiModal from "@/components/client-info/UpiModal";
import AddNoteModal from "./AddNoteModal";

const PAGE_SETTINGS_DEFAULTS = { showUpiReference: true, maskSensitiveData: false };

/** Masks all but the last `keep` characters — e.g. "••••••3210". */
function maskValue(v, keep = 4) {
  const s = String(v ?? "").trim();
  if (!s) return s;
  if (s.length <= keep) return "•".repeat(s.length);
  return "•".repeat(s.length - keep) + s.slice(-keep);
}

/* ── Activity categorisation — same scheme as the old Insight tab ── */
const CATEGORY_META = {
  payments: { color: "#0f9b8e", icon: "card" },
  ptp: { color: "#7c3aed", icon: "cal" },
  field: { color: "#3b6ea5", icon: "user" },
  status: { color: "#1E7E5E", icon: "check" },
  disposition: { color: "#e8a33d", icon: "doc" },
  default: { color: "#6b7280", icon: "warn" },
};

function categorizeActivity(a) {
  const t = `${a.activity_type || a.type || a.category || ""} ${a.description || ""}`.toLowerCase();
  if (t.includes("payment") || t.includes("link") || t.includes("sms") || t.includes("whatsapp") || t.includes("email")) return "payments";
  if (t.includes("ptp") || t.includes("promise")) return "ptp";
  if (t.includes("field") || t.includes("visit") || t.includes("assign")) return "field";
  if (t.includes("status") || t.includes("closed") || t.includes("recover")) return "status";
  return "default";
}

function commChannel(a) {
  const t = `${a.activity_type || a.type || ""} ${a.description || ""}`.toLowerCase();
  if (t.includes("whatsapp")) return "WhatsApp";
  if (t.includes("sms")) return "SMS";
  if (t.includes("email")) return "Email";
  if (t.includes("call")) return "Phone Call";
  if (t.includes("meeting") || t.includes("visit")) return "In Person";
  return "CRM Note";
}

function fmtDateTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "--";
  return `${ciDate(v)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

const TAG_TONES = ["bg-[#e8f5f0] text-[#1E7E5E]", "bg-[#eaf2fb] text-[#2563a8]", "bg-[#f3e8fd] text-[#6d28d9]"];

/** Icon + colour per communication type, for the compact Communication card. */
function commTypeMeta(a) {
  const t = `${a.activity_type || a.type || ""} ${a.description || ""}`.toLowerCase();
  if (t.includes("whatsapp")) return { label: "WhatsApp", icon: "whatsapp", color: "#1E7E5E" };
  if (t.includes("call")) return { label: "Phone Call", icon: "phone", color: "#22a55e" };
  if (t.includes("sms")) return { label: "SMS", icon: "mail", color: "#3b6ea5" };
  if (t.includes("email") || t.includes("mail")) return { label: "Email", icon: "mail", color: "#3b6ea5" };
  if (t.includes("meeting") || t.includes("visit")) return { label: "Meeting", icon: "users", color: "#7c3aed" };
  return { label: a.activity_type || a.type || "Note", icon: "doc", color: "#e8a33d" };
}

function MenuItem({ icon, label, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium transition hover:bg-surface ${
        tone === "danger" ? "text-danger" : "text-gray-700"
      }`}
    >
      {icon === "whatsapp" ? <WhatsAppIcon size={14} /> : <CiIcon name={icon} size={14} strokeWidth={2} className="text-gray-400" />}
      {label}
    </button>
  );
}

/**
 * Customer One Pager — dashboard-style summary (mirrors the classic
 * CRM "customer 360" layout: identity + overview + rating up top, then
 * contacts/deals/orders, timeline + notes, documents + additional info,
 * and communication history along the bottom).
 *
 * This is a lending/collections CRM, not a sales CRM, so a few labels
 * from that layout (Deals, Orders, Tags, Source) don't have a native
 * backing field here. Where real data exists (loan, payments, documents,
 * activity/PTP/disposition history) it's used as-is; where it doesn't,
 * the section still renders with a clearly-marked placeholder so the
 * page keeps the same shape without pretending fabricated data is real.
 *
 * Usage: /customer-one-pager?lead_id=…
 */
export default function OnePagerView({ leadId }) {
  const toast = useToast();
  const printRef = useRef(null);
  const commHistoryRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loan, setLoan] = useState(null);
  const [addressData, setAddressData] = useState([]);
  const [mobileData, setMobileData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [username, setUsername] = useState("");
  const [pageSettings, setPageSettings] = useState(PAGE_SETTINGS_DEFAULTS);
  const [payments, setPayments] = useState({ loading: true, rows: [] });
  const [docs, setDocs] = useState({ loading: true, rows: [] });
  const [feed, setFeed] = useState({ loading: true, timelineRaw: [], ptpRaw: [], dispRaw: [] });
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [activityMenu, setActivityMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [payLinkOn, setPayLinkOn] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  const [notes, setNotes] = useState([]); // session-local until a save API exists
  const [assignmentInfo, setAssignmentInfo] = useState({ loading: true, found: false, assignedOn: null, assignedByAudit: null });

  useEffect(() => {
    try {
      setPayLinkOn(localStorage.getItem("ci_paylink_enabled") === "1");
    } catch {}
  }, []);

  function togglePayLink(on) {
    setPayLinkOn(on);
    try {
      localStorage.setItem("ci_paylink_enabled", on ? "1" : "0");
    } catch {}
  }

  async function reloan() {
    const res = await clientFetch(`/api/reloan/enable?pan=${encodeURIComponent(ciSafe(loan?.pan))}`);
    if (res.status === 0) return toast.error("Network error.");
    const d = res.data || {};
    if (d.success === true) toast.success(d.message || "Done");
    else toast.error(d.message || "Done");
  }

  /* Core record — loan details + address */
  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [meRes, loanRes, psRes] = await Promise.all([
        clientFetch("/api/auth/me"),
        clientFetch(`/api/client/loan-details?lead_id=${encodeURIComponent(leadId)}`),
        clientFetch("/api/config/page-settings"),
      ]);
      if (cancelled) return;
      setRoles(meRes.data?.user?.roles || []);
      setUsername(meRes.data?.user?.username || "");
      if (psRes.data?.success) {
        setPageSettings({ ...PAGE_SETTINGS_DEFAULTS, ...(psRes.data.settings?.["customer-one-pager"] || {}) });
      }
      const loanDetails = loanRes.data?.data ?? null;
      if (!loanDetails) {
        setError(`No details found for Lead ID: ${leadId}`);
        setLoading(false);
        return;
      }
      setLoan(loanDetails);
      if (loanDetails.pan) {
        const [addrRes, mobRes] = await Promise.all([
          clientFetch(`/api/client/address?pan=${encodeURIComponent(loanDetails.pan)}`),
          clientFetch(`/api/client/mobile?pan=${encodeURIComponent(loanDetails.pan)}`),
        ]);
        if (!cancelled) {
          setAddressData(addrRes.data?.result || []);
          setMobileData(mobRes.data?.result || []);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  /* Payments ("Orders"), documents, and the merged activity feed — all load
     eagerly now that this is a single-page dashboard rather than tabs. */
  useEffect(() => {
    if (!loan || !leadId) return;
    let cancelled = false;

    (async () => {
      const res = await clientFetch(`/api/payments/fetch?leadId=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      setPayments({ loading: false, rows: res.status === 0 || (!res.ok && !res.data) ? [] : res.data?.data || [] });
    })();

    (async () => {
      const res = await clientFetch(`/api/docs/list?lead_id=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      setDocs({ loading: false, rows: res.status === 0 || !res.ok || !res.data?.success ? [] : res.data.documents || [] });
    })();

    (async () => {
      const params = new URLSearchParams({ lead_id: leadId });
      if (loan.loan_no) params.set("loan_no", loan.loan_no);
      const res = await clientFetch(`/api/leads/assignment-info?${params.toString()}`);
      if (cancelled) return;
      const d = res.data || {};
      setAssignmentInfo({
        loading: false,
        found: Boolean(d.success && d.found),
        assignedOn: d.assignedOn ?? null,
        assignedByAudit: d.assignedByAudit ?? null,
      });
    })();

    (async () => {
      const loanNo = loan.loan_no || "";
      const [tlRes, ptpRes, dispRes] = await Promise.all([
        clientFetch(`/api/leads/activity-timeline?lead_id=${encodeURIComponent(leadId)}`),
        clientFetch(`/api/ptp/list?leadId=${encodeURIComponent(leadId)}`),
        loanNo
          ? clientFetch(`/api/disposition/history?search=${encodeURIComponent(loanNo)}&limit=50`)
          : Promise.resolve({ ok: true, data: { rows: [] } }),
      ]);
      if (cancelled) return;
      setFeed({
        loading: false,
        timelineRaw: tlRes.data?.data || tlRes.data?.activities || tlRes.data?.result || [],
        ptpRaw: ptpRes.data?.data || [],
        dispRaw: dispRes.ok ? dispRes.data?.rows || [] : [],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loan, leadId]);

  const timelineEntries = useMemo(() => {
    if (!loan) return [];
    const loanNo = loan.loan_no || "";
    const entries = [];

    for (const a of feed.timelineRaw) {
      const date = a.created_at || a.activity_date || a.timestamp;
      if (!date) continue;
      entries.push({ date, title: a.activity_type || a.type || "Activity", subtitle: a.description || null, category: categorizeActivity(a) });
    }
    for (const p of feed.ptpRaw) {
      const date = p.created_at || p.ptp_date;
      if (!date) continue;
      const due = p.ptp_date ? ` by ${ciDate(p.ptp_date)}` : "";
      entries.push({
        date,
        title: `Promise to Pay${p.ptp_amount ? ` — ${ciInr(p.ptp_amount)}` : ""}${due}`,
        subtitle: p.action_taken || p.remarks || null,
        category: "ptp",
      });
    }
    for (const pmt of payments.rows) {
      const date = pmt.date;
      if (!date) continue;
      entries.push({ date, title: `Payment received — ${ciInr(pmt.amount ?? 0)}`, subtitle: pmt.mode || null, category: "payments" });
    }
    for (const d of feed.dispRaw) {
      const rLead = String(d.lead_id ?? d.leadId ?? "");
      const rLoan = String(d.loan_no ?? d.loanNo ?? d.loan_id ?? "");
      if (!((leadId && rLead === String(leadId)) || (loanNo && rLoan === String(loanNo)))) continue;
      const date = d.created_at || d.createdAt || d.created_on;
      if (!date) continue;
      entries.push({
        date,
        title: d.disposition_label || d.dispositionLabel || d.disposition_code || d.dispositionCode || "Disposition logged",
        subtitle: d.remarks || d.remark || d.comment || null,
        category: "disposition",
      });
    }
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    return entries;
  }, [feed, payments.rows, loan, leadId]);

  const commRows = useMemo(
    () => feed.timelineRaw.filter((a) => /call|sms|whatsapp|email|meeting|visit/i.test(`${a.activity_type || a.type || ""}`)).slice(0, 10),
    [feed.timelineRaw]
  );

  if (!leadId) return <ErrorState message="Invalid Lead ID." />;
  if (loading) return <PageLoader label="Loading customer summary…" />;
  if (error || !loan) return <ErrorState message={error || "Something went wrong."} />;

  const statusMeta = getStatusMeta(loan.loan_status);
  const priority = getPriority(parseInt(loan.overdue_days) || 0);
  const { isAdmin, isHead, isExec, isAcm } = getRoleFlags(roles);
  const isClosed = String(loan.loan_status || "").trim().toLowerCase() === "closed";
  const feedLoading = feed.loading;
  const maskOn = pageSettings.maskSensitiveData;
  const masked = (v) => (maskOn ? maskValue(v) : v);

  const references = [1, 2]
    .map((n) => ({ name: loan[`reference_name_${n}`], relation: loan[`ref_relation_${n}`], contact: loan[`mobile_number_${n}`] }))
    .filter((r) => r.name || r.contact);

  const agentName = loan.collection_assigned_to_agent_name ?? loan.agent_name ?? loan.emp_name ?? null;
  const allocBy = loan.collection_assigned_by_agent_name ?? loan.allocated_by ?? loan.assigned_by ?? null;

  const callLead = {
    leadId: leadId,
    name: loan.full_name ?? "",
    loanId: loan.loan_no ?? "",
    mobile: loan.mobile ?? "",
    altMobile: loan.alternate_mobile ?? "",
    status: loan.loan_status ?? "",
    claimAmt: parseFloat(loan.penalty_amount) || 0,
    principal: parseFloat(loan.principal_outstanding) || 0,
    dpd: parseInt(loan.overdue_days) || 0,
    loanAmt: parseFloat(loan.loan_amount) || 0,
  };


  const sinceYears = (() => {
    if (!loan.sanction_date) return null;
    const d = new Date(loan.sanction_date);
    if (isNaN(d.getTime())) return null;
    const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return years >= 0 ? years.toFixed(1) : null;
  })();

  const daysSinceAssigned = (() => {
    if (!assignmentInfo.found || !assignmentInfo.assignedOn) return null;
    const d = new Date(assignmentInfo.assignedOn);
    if (isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  })();

  const tags = [loan.loan_type, loan.product_type, isClosed ? "Closed" : `${priority.label} Priority`].filter(Boolean).slice(0, 3);
  const showPhoto = Boolean(leadId);

  const infoCell = (label, value) => (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-gray-800">{value ?? "--"}</div>
    </div>
  );

  const statBox = (label, value, tone) => (
    <div className="rounded-xl border border-line p-3 text-center">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`mt-1 text-base font-bold ${tone === "danger" ? "text-danger" : "text-gray-800"}`}>{value}</div>
    </div>
  );

  const kvRow = (label, value) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 text-[12.5px] last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-800">{value ?? "--"}</span>
    </div>
  );

  const docLink = "inline-block rounded bg-accent-light px-2.5 py-1 text-xs font-bold text-accent-dark no-underline hover:bg-accent hover:text-white";
  const docTypeLabel = (type) =>
    String(type ?? "Document")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      {isClosed && <ClosedCelebration collectionAmount={loan.collection_amount} />}

      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-gray-600 transition hover:bg-gray-50"
            aria-label="Back"
          >
            <CiIcon name="back" size={16} strokeWidth={2} />
          </button>
          <h1 className="font-display text-xl font-bold text-gray-800">Customer Details</h1>
        </div>

        <div className="flex items-center gap-2" onMouseLeave={() => { setActivityMenu(false); setMoreMenu(false); }}>
          <button type="button" className="btn-secondary" onClick={() => setOpenModal("updatePayment")}>
            Edit
          </button>

          <div className="relative">
            <button type="button" className="btn-secondary" onClick={() => { setActivityMenu((v) => !v); setMoreMenu(false); }}>
              Add Activity
            </button>
            {activityMenu && (
              <div className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
                <MenuItem icon="phone" label="Log a Call" onClick={() => { setOpenModal("call"); setActivityMenu(false); }} />
                <MenuItem icon="whatsapp" label="Send WhatsApp" onClick={() => { setOpenModal("whatsapp"); setActivityMenu(false); }} />
              </div>
            )}
          </div>

          <div className="relative">
            <button type="button" className="btn-primary" onClick={() => { setMoreMenu((v) => !v); setActivityMenu(false); }}>
              More
            </button>
            {moreMenu && (
              <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
                {(isAdmin || isHead || isExec || isAcm) && (
                  <MenuItem icon="doc" label="Collection Logs" onClick={() => { setOpenModal("collectionLogs"); setMoreMenu(false); }} />
                )}
                {(isAdmin || isHead || isAcm) && (
                  <MenuItem icon="rupee" label="Update Payment" onClick={() => { setOpenModal("updatePayment"); setMoreMenu(false); }} />
                )}
                {(isAdmin || isAcm) && <MenuItem icon="lock" label="Reloan" onClick={() => { reloan(); setMoreMenu(false); }} />}
                {(isAdmin || isHead || isExec || isAcm) && (
                  <MenuItem icon="block" label="Block PAN" tone="danger" onClick={() => { setOpenModal("blockPan"); setMoreMenu(false); }} />
                )}
                {pageSettings.showUpiReference && (
                  <MenuItem icon="card" label="UPI References" onClick={() => { setOpenModal("upi"); setMoreMenu(false); }} />
                )}
                {!isClosed && (
                  <MenuItem
                    icon="link"
                    label={payLinkOn ? "Disable Pay Link" : "Enable Pay Link"}
                    onClick={() => { togglePayLink(!payLinkOn); setMoreMenu(false); }}
                  />
                )}
                {payLinkOn && !isClosed && (
                  <MenuItem icon="rupee" label="Generate Pay Link" onClick={() => { setOpenModal("payLink"); setMoreMenu(false); }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="one-pager-print" ref={printRef}>
        {/* Row 1 — Identity · Overview · Rating & Tags */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-dark font-display text-lg font-bold text-white ring-2 ring-accent-light">
                {showPhoto ? (
                  <img
                    src={`/api/docs/aadhar?lead_id=${encodeURIComponent(leadId)}`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className={showPhoto ? "pointer-events-none" : ""}>{ciInitials(loan.full_name ?? "")}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display text-base font-bold text-gray-800">{ciSafe(loan.full_name)}</span>
                  <span
                    className="badge border"
                    style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: "currentColor" }}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-gray-400">CUS-{ciSafe(leadId)}</div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-[12px] text-gray-500">
              <div>
                Customer Since {ciDate(loan.sanction_date)}
                {sinceYears ? ` (${sinceYears} Yr)` : ""}
              </div>
              <div>Customer Type: Individual</div>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-[12.5px] text-gray-600">
              {loan.personal_email && (
                <div className="flex items-center gap-2">
                  <CiIcon name="mail" size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">{ciSafe(masked(loan.personal_email))}</span>{" "}
                  <span className="shrink-0 text-[10px] text-gray-400">(Personal)</span>
                </div>
              )}
              {loan.office_email && (
                <div className="flex items-center gap-2">
                  <CiIcon name="mail" size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">{ciSafe(masked(loan.office_email))}</span>{" "}
                  <span className="shrink-0 text-[10px] text-gray-400">(Official)</span>
                </div>
              )}
              {!loan.personal_email && !loan.office_email && (
                <div className="flex items-center gap-2">
                  <CiIcon name="mail" size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">{ciSafe(null)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CiIcon name="phone" size={14} className="shrink-0 text-gray-400" />
                {ciSafe(masked(loan.mobile))} <span className="text-[10px] text-gray-400">(Personal)</span>
              </div>
              {loan.alternate_mobile && (
                <div className="flex items-center gap-2">
                  <CiIcon name="phone" size={14} className="shrink-0 text-gray-400" />
                  {ciSafe(masked(loan.alternate_mobile))} <span className="text-[10px] text-gray-400">(Work)</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <CiIcon name="pin" size={14} className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {addressData.length > 0
                    ? ciSafe([addressData[0].address, addressData[0].city, addressData[0].state, addressData[0].pincode].filter(Boolean).join(", "))
                    : "No address on record."}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Summary</h4>
            <div className="grid grid-cols-3 gap-2.5">
              {statBox("Loan Amount", ciInr(loan.loan_amount ?? 0))}
              {statBox("Loan Tenure", `${ciSafe(loan.tenure)} Days`)}
              {statBox("Sanction Date", ciDate(loan.sanction_date))}
              {statBox("Repayment Amount", ciInr(loan.repayment_amount ?? 0))}
              {statBox("Repayment Date", ciDate(loan.repayment_date))}
              {statBox("Collected Amount", ciInr(loan.collection_amount ?? 0))}
              {statBox("Collection Date", ciDate(loan.collection_date))}
              {statBox("Payment Today", ciInr(loan.ontime_repayment_amount ?? 0))}
              <div className="rounded-xl border border-[#ddd0f7] bg-[#f6f1fd] p-3 text-center shadow-sm">
                <div className="text-[11px] font-semibold text-[#7c3aed]">Salary Date</div>
                <div className="mt-1 text-base font-bold text-[#6d28d9]">{ciDate(loan.fixed_salary_date)}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="mb-1.5 text-[11px] font-semibold text-gray-500">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className={`badge ${TAG_TONES[i % TAG_TONES.length]}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-bold text-gray-800">Communication</h4>
              <button
                type="button"
                onClick={() => commHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="text-[12px] font-semibold text-accent-dark hover:underline"
              >
                View All
              </button>
            </div>
            {feedLoading ? (
              <p className="text-[12.5px] text-gray-400">Loading…</p>
            ) : commRows.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No communication logs recorded yet.</p>
            ) : (
              <div className="relative pl-1">
                <div className="absolute bottom-3 left-[15px] top-3 w-px bg-line" />
                <div className="space-y-4">
                  {commRows.slice(0, 4).map((a, i) => {
                    const meta = commTypeMeta(a);
                    return (
                      <div key={i} className="relative flex gap-3">
                        <span
                          className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: meta.color }}
                        >
                          {meta.icon === "whatsapp" ? <WhatsAppIcon size={14} /> : <CiIcon name={meta.icon} size={14} strokeWidth={2} />}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-bold text-gray-800">{meta.label}</div>
                              <div className="mt-0.5 truncate text-[11.5px] text-gray-500">{ciSafe(a.description, "--")}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[11px] font-semibold text-gray-700">{ciSafe(agentName, "--")}</div>
                              <div className="text-[10.5px] text-gray-400">{fmtDateTime(a.created_at || a.activity_date || a.timestamp)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 1.5 — Case Assignment */}
        <div className="mt-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <CiIcon name="users" size={15} strokeWidth={2} className="text-accent-dark" />
              <h4 className="text-[13px] font-bold text-gray-800">Case Assignment</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {infoCell("Assigned To", ciSafe(agentName))}
              {infoCell("Assigned By", ciSafe(allocBy || assignmentInfo.assignedByAudit))}
              {infoCell(
                "Assigned On",
                assignmentInfo.loading ? "Loading…" : assignmentInfo.found ? fmtDateTime(assignmentInfo.assignedOn) : "Not available"
              )}
              {infoCell(
                "Days Since Assigned",
                assignmentInfo.loading
                  ? "…"
                  : assignmentInfo.found
                    ? `${daysSinceAssigned} day${daysSinceAssigned === 1 ? "" : "s"}`
                    : "—"
              )}
            </div>
            {!assignmentInfo.loading && !assignmentInfo.found && (
              <p className="mt-2.5 text-[10.5px] text-gray-400">
                No assignment timestamp found in the audit trail for this case — this only tracks single manual
                assignments today, not bulk or round-robin assignment.
              </p>
            )}
          </div>
        </div>

        {/* Row 2 — Related Contacts · Deals · Orders */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Related Contacts</h4>
            {references.length > 0 ? (
              <div className="space-y-3">
                {references.map((r, i) => (
                  <div key={i} className={i > 0 ? "border-t border-gray-100 pt-3" : ""}>
                    <div className="text-[12.5px] font-semibold text-gray-800">
                      {ciSafe(r.name)} <span className="font-normal text-gray-400">({ciSafe(r.relation)})</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500">
                      <CiIcon name="phone" size={12} />
                      {ciSafe(masked(r.contact))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-gray-400">No related contacts on record.</p>
            )}
            <button
              type="button"
              onClick={() => toast.error("Adding contacts isn't available yet.")}
              className="mt-3 text-[12px] font-semibold text-accent-dark hover:underline"
            >
              + Add Contact
            </button>
          </div>

          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Running Loan</h4>
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-gray-800">
                  {ciSafe(loan.loan_type, "Personal")} Loan — {ciSafe(loan.loan_no)}
                </span>
                <span className="badge border" style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: "currentColor" }}>
                  {statusMeta.label}
                </span>
              </div>
              <div className="mt-1.5 text-[13px] font-bold text-accent-dark">{ciInr(loan.loan_amount ?? 0)}</div>
            </div>
            <p className="mt-2 text-[10.5px] text-gray-400">This CRM tracks one loan per customer, shown here as a single deal.</p>
          </div>

          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Repayment History({payments.loading ? "…" : payments.rows.length})</h4>
            {payments.loading ? (
              <p className="text-[12.5px] text-gray-400">Loading…</p>
            ) : payments.rows.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No orders recorded yet.</p>
            ) : (
              <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                {payments.rows.map((p, i) => {
                  const sameLead = p.is_same_lead === true || p.is_same_lead === "true";
                  return (
                    <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 text-[12.5px] last:border-0 last:pb-0">
                      <div>
                        <div className="font-semibold text-gray-800">{ciSafe(p.loan_no)}</div>
                        <div className="text-[11px] text-gray-400">{ciDate(p.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#1E7E5E]">{ciInr(p.amount ?? 0)}</div>
                        <div className="text-[11px] text-gray-400">{sameLead ? "Completed" : ciSafe(p.mode)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Timeline/Activities · Notes */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Timeline / Activities</h4>
            {feedLoading ? (
              <p className="text-[12.5px] text-gray-400">Loading activity…</p>
            ) : timelineEntries.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No recorded activity yet for this customer.</p>
            ) : (
              <div className="relative max-h-[380px] overflow-y-auto pl-2 pr-1">
                <div className="absolute bottom-2 left-[13px] top-2 w-px bg-line" />
                <div className="space-y-4">
                  {timelineEntries.slice(0, 20).map((e, i) => {
                    const meta = CATEGORY_META[e.category] || CATEGORY_META.default;
                    return (
                      <div key={i} className="relative flex gap-3">
                        <span
                          className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                          style={{ borderColor: meta.color, background: meta.color + "1a", color: meta.color }}
                        >
                          <CiIcon name={meta.icon} size={12} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="text-[12.5px] font-semibold text-gray-800">{e.title}</div>
                          {e.subtitle && <div className="mt-0.5 text-[11.5px] text-gray-500">{e.subtitle}</div>}
                          <div className="mt-0.5 text-[10.5px] text-gray-400">{fmtDateTime(e.date)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-bold text-gray-800">Notes</h4>
              <button
                type="button"
                onClick={() => setOpenModal("notes")}
                className="text-[12px] font-semibold text-accent-dark hover:underline"
              >
                + Add Note
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No notes yet — click + Add Note after a call or interaction.</p>
            ) : (
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {notes.map((n, i) => (
                  <div key={i} className="rounded-lg border border-[#f0d9a8] bg-[#fdf6e9] p-3">
                    <p className="whitespace-pre-wrap text-[12.5px] text-gray-700">{n.text}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{ciSafe(n.author || agentName, "Collection Team")}</span>
                      <span>{fmtDateTime(n.at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10.5px] text-gray-400">
              Notes are kept for this session only — saving to the database is coming soon.
            </p>
          </div>
        </div>

        {/* Row 4 — Documents · Additional Information */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-bold text-gray-800">Documents</h4>
              {docs.rows.length > 4 && (
                <button type="button" onClick={() => setShowAllDocs((v) => !v)} className="text-[12px] font-semibold text-accent-dark hover:underline">
                  {showAllDocs ? "Show Less" : "View All Documents"}
                </button>
              )}
            </div>
            {docs.loading ? (
              <p className="text-[12.5px] text-gray-400">Loading documents…</p>
            ) : docs.rows.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No documents found for this lead.</p>
            ) : (
              <div className="space-y-2">
                {(showAllDocs ? docs.rows : docs.rows.slice(0, 4)).map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 text-[12.5px] last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-gray-700">
                      <CiIcon name="doc" size={14} className="text-accent" />
                      {docTypeLabel(d.type)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{ciDate(d.createdAt)}</span>
                      {d.url ? (
                        <a className={docLink} href={d.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400">N/A</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Additional Information</h4>
            <div className="grid grid-cols-2 gap-3">
              {infoCell("Date of Birth", ciDate(loan.dob))}
              {infoCell("Occupation", ciSafe(loan.occupation))}
              {infoCell("PAN Number", ciSafe(masked(loan.pan)))}
              {infoCell("Aadhaar Number", ciSafe(masked(loan.aadhaar)))}
              {infoCell("Bank Account", ciSafe(masked(loan.bank_acc_no)))}
              {infoCell("IFSC Code", ciSafe(masked(loan.ifsc_code)))}
            </div>
          </div>
        </div>

        {/* Row 5 — Communication History */}
        <div ref={commHistoryRef} className="mt-4 scroll-mt-4">
          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Communication History</h4>
            {feedLoading ? (
              <p className="text-[12.5px] text-gray-400">Loading…</p>
            ) : commRows.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No communication logs recorded yet for this customer.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-surface text-left text-gray-500">
                      <th className="px-3 py-1.5 font-semibold">Date</th>
                      <th className="px-3 py-1.5 font-semibold">Type</th>
                      <th className="px-3 py-1.5 font-semibold">Subject / Summary</th>
                      <th className="px-3 py-1.5 font-semibold">Channel</th>
                      <th className="px-3 py-1.5 font-semibold">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commRows.map((a, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-700">{ciDate(a.created_at || a.activity_date || a.timestamp)}</td>
                        <td className="px-3 py-1.5 text-gray-700">{ciSafe(a.activity_type || a.type)}</td>
                        <td className="px-3 py-1.5 text-gray-700">{ciSafe(a.description)}</td>
                        <td className="px-3 py-1.5 text-gray-700">{commChannel(a)}</td>
                        <td className="px-3 py-1.5 text-gray-700">{ciSafe(masked(loan.mobile))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Row 6 — Address (from GET /api/client/address) */}
        <div className="mt-4">
          <div className="card p-4">
            <h4 className="mb-3 text-[13px] font-bold text-gray-800">Address</h4>
            {addressData.length === 0 ? (
              <p className="text-[12.5px] text-gray-400">No address found for PAN: {ciSafe(loan.pan)}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {addressData.map((addr, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge border border-accent/40 bg-accent-light text-accent-dark">
                        {ciSafe(addr.address_source, "Address")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-[12.5px] text-gray-700">
                      <CiIcon name="pin" size={14} className="mt-0.5 shrink-0 text-gray-400" />
                      <span>{ciSafe(addr.address)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2 text-[11.5px] text-gray-500">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">City</div>
                        <div className="font-semibold text-gray-700">{ciSafe(addr.city)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">State</div>
                        <div className="font-semibold text-gray-700">{ciSafe(addr.state)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">Pincode</div>
                        <div className="font-semibold text-gray-700">{ciSafe(addr.pincode)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* <div className="mt-4 text-center text-[10px] text-gray-400">
          This is a system-generated summary from Collection CRM — for internal use only.
        </div> */}
      </div>

      <BlockPanModal open={openModal === "blockPan"} onClose={() => setOpenModal(null)} pan={loan.pan} />
      <PayLinkModal open={openModal === "payLink"} onClose={() => setOpenModal(null)} loan={loan} leadId={leadId} />
      <UpdatePaymentModal
        open={openModal === "updatePayment"}
        onClose={() => setOpenModal(null)}
        loan={loan}
        leadId={leadId}
        isClosed={isClosed}
        redirectTo="/customer-one-pager"
      />
      <CollectionLogsModal open={openModal === "collectionLogs"} onClose={() => setOpenModal(null)} leadId={leadId} />
      {openModal === "call" && <CallModal lead={callLead} agentEmail={username} onClose={() => setOpenModal(null)} />}
      <WhatsAppChatModal
        open={openModal === "whatsapp"}
        onClose={() => setOpenModal(null)}
        mobile={loan.mobile ?? ""}
        name={loan.full_name ?? ""}
      />
      {openModal === "notes" && (
        <AddNoteModal
          author={agentName}
          onClose={() => setOpenModal(null)}
          onSave={(text) => setNotes((prev) => [{ text, author: agentName, at: new Date().toISOString() }, ...prev])}
        />
      )}
      {pageSettings.showUpiReference && (
        <UpiModal open={openModal === "upi"} onClose={() => setOpenModal(null)} mobileData={mobileData} pan={loan.pan} />
      )}
    </div>
  );
}
