"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { scoreListRow } from "@/lib/leadScoring";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/Feedback";
import { PageLoader } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import {
  isPrivilegedUser,
  sortLoanList,
  SORTABLE_COLUMNS,
  fmtInr,
  fmtDMonY,
  buildQuery,
  ucwords,
  numFmt,
} from "./leadUtils";
import PortfolioDashboard from "./PortfolioDashboard";
import PortfolioCardModal from "./PortfolioCardModal";
import LeadsToolbar from "./LeadsToolbar";
import LeadsTable from "./LeadsTable";
import LeadsPagination from "./LeadsPagination";
import SortFilterPanel from "./SortFilterPanel";
import PtpModal from "./PtpModal";
import AssignFieldModal from "./AssignFieldModal";
import RemarksModal from "./RemarksModal";
import ActivityTimelinePanel from "./ActivityTimelinePanel";
import DispositionFilteredView from "./DispositionFilteredView";
import LoanHistoryModal from "./LoanHistoryModal";
import CallModal from "./CallModal";

/* Shared WhatsApp modals — built by the integrations module. Loaded
   dynamically (client-only) and guarded so a load failure never crashes. */
const WhatsAppChatModal = dynamicImport(
  () =>
    import("@/components/integrations/WhatsAppChatModal").catch(() => ({
      default: () => null,
    })),
  { ssr: false }
);
const WhatsAppTemplateModal = dynamicImport(
  () =>
    import("@/components/integrations/WhatsAppTemplateModal").catch(() => ({
      default: () => null,
    })),
  { ssr: false }
);

export default function LeadsPageClient({ roles, username, jwtToken, searchParams }) {
  const router = useRouter();
  const toast = useToast();

  /* ── Params (mirror of the PHP $_GET parsing) ─────────────────────────── */
  const sp = searchParams || {};
  const statusFilter = sp.status || "all";
  const limit = Math.max(parseInt(sp.limit || "10", 10) || 10, 1);
  const page = Math.max(parseInt(sp.page || "1", 10) || 1, 1);
  const search = (sp.search || "").trim();
  const sort = sp.sort || "";
  const order = String(sp.order || "").toLowerCase() === "desc" ? "desc" : "asc";
  const dispositionCode = sp.disposition_code || "";
  const hasFilter = Boolean(
    sp.salary_date_from || sp.salary_date_to || sp.repayment_date_from || sp.repayment_date_to ||
    sp.repayment_amount_min || sp.repayment_amount_max || sp.dpd_min || sp.dpd_max ||
    sp.dpd_bucket || sp.city || sp.state || sp.agent_name || sp.disposition_code
  );
  const privileged = isPrivilegedUser(roles);
  const canLoad = privileged || search !== "";

  /* ── Data state ───────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(canLoad);
  const [apiError, setApiError] = useState(null);
  const [loanList, setLoanList] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);

  const listQueryKey = useMemo(() => buildQuery({
    page, limit, search,
    city: sp.city, state: sp.state, agent_name: sp.agent_name,
    salary_date_from: sp.salary_date_from, salary_date_to: sp.salary_date_to,
    repayment_amount_min: sp.repayment_amount_min, repayment_amount_max: sp.repayment_amount_max,
    repayment_date_from: sp.repayment_date_from, repayment_date_to: sp.repayment_date_to,
    dpd_min: sp.dpd_min, dpd_max: sp.dpd_max, dpd_bucket: sp.dpd_bucket,
  }), [page, limit, search, sp.city, sp.state, sp.agent_name, sp.salary_date_from, sp.salary_date_to, sp.repayment_amount_min, sp.repayment_amount_max, sp.repayment_date_from, sp.repayment_date_to, sp.dpd_min, sp.dpd_max, sp.dpd_bucket]);

  const loadList = useCallback(async () => {
    if (!canLoad) {
      setLoanList([]); setTotal(0); setTotalPages(0); setLoading(false); setApiError(null);
      return;
    }
    setLoading(true);
    setApiError(null);
    const res = await clientFetch(`/api/leads/list?${listQueryKey}`);
    if (!res.ok || !res.data || res.data.success === false) {
      setApiError(res.data?.message || res.error || "Connection error");
      setLoanList([]); setTotal(0); setTotalPages(0);
    } else {
      const leads = res.data.leads || [];
      const pagination = res.data.pagination || {};
      setLoanList(leads);
      const t = pagination.totalItems ?? leads.length;
      setTotal(t);
      setCurrentPage(pagination.currentPage ?? page);
      setTotalPages(pagination.totalPages ?? Math.max(1, Math.ceil(t / limit)));
    }
    setLoading(false);
  }, [canLoad, listQueryKey, page, limit]);

  useEffect(() => { loadList(); }, [loadList]);

  /* Smart Prioritization (Settings toggle) — fetched once; fully inert
     (no scoring, no column, no extra work) when disabled. */
  const [priorityEnabled, setPriorityEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch("/api/config/smart-prioritization");
      if (alive && res.ok && res.data?.success) setPriorityEnabled(Boolean(res.data.config?.enabled));
    })();
    return () => { alive = false; };
  }, []);

  const scoredList = useMemo(() => {
    if (!priorityEnabled) return loanList;
    return loanList.map((row) => {
      const info = scoreListRow(row);
      return { ...row, __priority_sort: info.scoreStr, __priorityInfo: info };
    });
  }, [loanList, priorityEnabled]);

  /* Latest Disposition column — no per-lead filter exists on
     /api/disposition/history, so fetch the N most recent records for the
     whole portfolio ONCE (not per row, not per page/filter change) and
     look each row up against that batch. Leads whose last disposition
     falls outside this recent window simply show no status. */
  const [dispositionByLead, setDispositionByLead] = useState(new Map());
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch("/api/disposition/history?limit=400");
      if (!alive || !res.ok || !res.data?.success) return;
      const rows = Array.isArray(res.data.rows) ? res.data.rows : [];
      const pick = (row, keys) => {
        for (const k of keys) {
          const v = row?.[k];
          if (v !== undefined && v !== null && v !== "") return v;
        }
        return null;
      };
      const withDates = rows
        .map((r) => ({ row: r, date: pick(r, ["created_at", "createdAt", "created_on"]) }))
        .filter((r) => r.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const map = new Map();
      for (const { row, date } of withDates) {
        const key = String(pick(row, ["lead_id", "leadId"]) ?? pick(row, ["loan_no", "loanNo", "loan_id"]) ?? "");
        if (!key || map.has(key)) continue; // keep only the first (most recent) per key
        const label = pick(row, ["disposition_label", "dispositionLabel", "disposition_code", "dispositionCode"]);
        if (!label) continue;
        map.set(key, { label: String(label), date });
      }
      if (alive) setDispositionByLead(map);
    })();
    return () => { alive = false; };
  }, []);

  const withDisposition = useMemo(() => {
    if (dispositionByLead.size === 0) return scoredList;
    return scoredList.map((row) => {
      const key = String(row.lead_id ?? row.loan_id ?? "");
      const latest = dispositionByLead.get(key) ?? null;
      return latest ? { ...row, __latestDisposition: latest } : row;
    });
  }, [scoredList, dispositionByLead]);

  /* Client-side sort — same as the PHP usort (privileged users only) */
  const sortedList = useMemo(() => {
    if (privileged && SORTABLE_COLUMNS[sort]) return sortLoanList(withDisposition, sort, order);
    return withDisposition;
  }, [withDisposition, privileged, sort, order]);

  const totalSanction = useMemo(
    () => sortedList.reduce((s, r) => s + (parseFloat(r.sanction_amount) || 0), 0), [sortedList]);
  const totalRepayment = useMemo(
    () => sortedList.reduce((s, r) => s + (parseFloat(r.repayment_amount) || 0), 0), [sortedList]);

  /* ── Portfolio dashboard cards ────────────────────────────────────────── */
  const [pfDash, setPfDash] = useState({ loading: true, error: null, data: {} });
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch("/api/leads/portfolio-dashboard");
      if (!alive) return;
      if (!res.ok || !res.data || res.data.success === false) {
        setPfDash({ loading: false, error: res.data?.message || res.error || "Request failed", data: {} });
      } else {
        setPfDash({ loading: false, error: null, data: res.data.data || {} });
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── Navigation (mirrors PHP full-page GET navigation) ────────────────── */
  const currentParams = useMemo(() => {
    const obj = {};
    Object.entries(sp).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") obj[k] = v; });
    return obj;
  }, [sp]);

  const navigate = useCallback((params) => {
    const qs = buildQuery(params);
    router.push(qs ? `/leads?${qs}` : "/leads");
  }, [router]);

  const gotoPage = useCallback((pg) => {
    navigate({ ...currentParams, page: pg });
  }, [navigate, currentParams]);

  /* lp_sortLink behaviour: toggle asc/desc on the clicked column */
  const onSort = useCallback((col) => {
    const nextOrder = sort === col && order === "asc" ? "desc" : "asc";
    navigate({ ...currentParams, sort: col, order: nextOrder });
  }, [navigate, currentParams, sort, order]);

  /* ── Copy token (lpCopyToken) ─────────────────────────────────────────── */
  const [copied, setCopied] = useState(false);
  const copyToken = async () => {
    if (!jwtToken) { toast.error("No token found."); return; }
    try {
      await navigator.clipboard.writeText(jwtToken);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = jwtToken; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Token copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Modal state ──────────────────────────────────────────────────────── */
  const [sortFilterOpen, setSortFilterOpen] = useState(false);
  const [pfCard, setPfCard] = useState(null); // { key, label }
  const [ptp, setPtp] = useState(null);
  const [assign, setAssign] = useState(null);
  const [remarks, setRemarks] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loanHistory, setLoanHistory] = useState(null);
  const [call, setCall] = useState(null);
  const [waChat, setWaChat] = useState(null); // { mobile, name } — wacOpen
  const [waTemplate, setWaTemplate] = useState(null); // lpOpenWhatsAppTemplate args

  /* ── WhatsApp quick chat (lpOpenWhatsApp): direct freeform send with
        wa.me fallback — identical flow & wording. ─────────────────────────── */
  const openWhatsApp = async (mobile, name, loanId) => {
    if (!mobile) { toast.error("No mobile number on record"); return; }
    const greeting =
      "Hello " + (name || "") + ", this is regarding your loan" +
      (loanId ? " (" + loanId + ")" : "") + " with BlinkrLoan. ";
    const manualFallback = () => {
      let clean = String(mobile).replace(/\D/g, "");
      if (clean.length === 10) clean = "91" + clean;
      window.open("https://wa.me/" + clean + "?text=" + encodeURIComponent(greeting), "_blank");
    };
    const res = await postJson("/api/whatsapp/send-freeform", { phone: mobile, content: greeting });
    if (res.ok && res.data?.success) {
      toast.success("WhatsApp message sent to " + (name || mobile));
    } else if (res.data?.code === "OUTSIDE_SESSION_WINDOW") {
      toast.error("Outside 24h window — opening WhatsApp to send manually, or use a Template instead.");
      manualFallback();
    } else if (res.status === 0) {
      toast.error("Network error — opening WhatsApp instead.");
      manualFallback();
    } else {
      toast.error(res.data?.message || "Could not send — opening WhatsApp instead.");
      manualFallback();
    }
  };

  /* ── Row action handlers (same data plumbing as the PHP onclick args) ─── */
  const rowActions = {
    onTimeline: (row) => setTimeline({
      leadId: row.lead_id ?? row.loan_id ?? "",
      name: row.full_name ?? "", loanId: row.loan_id ?? "", status: row.payment_status ?? "",
    }),
    onCall: (row) => setCall({
      leadId: row.lead_id ?? row.loan_id ?? "",
      name: row.full_name ?? "", loanId: row.loan_id ?? "",
      mobile: row.mobile ?? "", altMobile: row.alternate_mobile ?? "",
      status: row.payment_status ?? "",
      claimAmt: parseFloat(row.balance_claim_amount ?? row.claim_amount ?? 0) || 0,
      principal: parseFloat(row.principal_outstanding ?? row.ontime_repayment_amount ?? 0) || 0,
      dpd: parseInt(row.dpd ?? row.overdue_days ?? 0, 10) || 0,
      loanAmt: parseFloat(row.loan_amount ?? row.sanction_amount ?? 0) || 0,
    }),
    onWhatsApp: (row) => openWhatsApp(row.mobile ?? "", row.full_name ?? "", row.loan_id ?? ""),
    onWhatsAppTemplate: (row) => setWaTemplate({
      name: row.full_name ?? "", mobile: row.mobile ?? "", loanId: row.loan_id ?? "",
      repaymentAmount: parseFloat(row.repayment_amount ?? 0) || 0,
      repaymentDate: row.repayment_date_ist ? fmtDMonY(row.repayment_date_ist) : "",
    }),
    onWhatsAppChat: (row) => setWaChat({ mobile: row.mobile ?? "", name: row.full_name ?? "" }),
    onRemarks: (row) => setRemarks({
      leadId: row.lead_id ?? row.loan_id ?? "",
      name: row.full_name ?? "", loanId: row.loan_id ?? "",
      custNo: row.customer_no ?? "", mobile: row.mobile ?? "",
      status: row.payment_status ?? "", dpd: parseInt(row.dpd ?? 0, 10) || 0,
    }),
    onPtp: (row) => setPtp({
      leadId: row.lead_id ?? row.loan_id ?? "",
      name: row.full_name ?? "", loanId: row.loan_id ?? "",
      pendingAmt: parseFloat(row.ontime_repayment_amount ?? row.repayment_amount ?? 0) || 0,
    }),
    onAssign: (row) => setAssign({
      leadId: row.lead_id ?? row.loan_id ?? "",
      name: row.full_name ?? "", loanId: row.loan_id ?? "",
    }),
    onLoanHistory: (row, isReloan) => setLoanHistory({
      leadId: row.lead_id ?? "", name: row.full_name ?? "",
      loanId: row.loan_id ?? "", mobile: row.mobile ?? "", isReloan,
    }),
  };

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  return (
    <div>
      {/* ── Page header ── */}
      <PageHeader
        title="Loan Portfolio"
        subtitle="Browse, filter and manage all active loan accounts"
        actions={
          <>
            <button
              className={`btn-secondary ${copied ? "!border-accent !bg-accent-light !text-accent-dark" : ""}`}
              onClick={copyToken}
              title="Copy your login token"
            >
              {copied ? "Copied!" : "Copy Token"}
            </button>
            <a
              href={`/leads?${buildQuery({ ...currentParams, export: "csv" })}`}
              className="btn-secondary"
            >
              Export CSV
            </a>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </>
        }
      />

      {/* ── Portfolio Dashboard Cards — temporarily hidden, not removed ── */}
      {/* <PortfolioDashboard
        loading={pfDash.loading}
        error={pfDash.error}
        dashboard={pfDash.data}
        onCardClick={(key, label) => setPfCard({ key, label })}
      /> */}

      {/* ── Toolbar ── */}
      <LeadsToolbar
        search={search}
        limit={limit}
        hasFilter={hasFilter}
        sort={sort}
        statusFilter={statusFilter}
        currentParams={currentParams}
        onNavigate={navigate}
        onOpenSortFilter={() => setSortFilterOpen(true)}
      />

      {/* ── Table card ── */}
      <div className="card mt-4">
        {dispositionCode ? (
          <DispositionFilteredView
            code={dispositionCode}
            page={page}
            limit={limit}
            onGotoPage={gotoPage}
            onChangeLimit={(l) => navigate({ ...currentParams, limit: l, page: 1 })}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h3 className="font-display text-base font-semibold text-gray-800">
                Loan Accounts
                {statusFilter !== "all" && (
                  <span className="ml-2 font-sans text-xs font-normal text-gray-400">
                    — filtered by{" "}
                    <strong className="text-accent-dark">{ucwords(statusFilter.replace(/_/g, " "))}</strong>
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span>
                  Showing <strong className="text-gray-700">{numFmt(from)}–{numFmt(to)}</strong> of{" "}
                  <strong className="text-gray-700">{numFmt(total)}</strong> records
                </span>
                {sortedList.length > 0 && (
                  <>
                    <span className="badge bg-accent-light text-accent-dark">
                      Sanction: {fmtInr(totalSanction)}
                    </span>
                    <span className="badge bg-accent-light text-accent-dark">
                      Repayment: {fmtInr(totalRepayment)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {!privileged && !search ? (
              <EmptyState
                icon="🔒"
                title="Access Restricted"
                hint="You don't have sufficient permissions to view the full loan portfolio. Please use the search bar to look up specific accounts, or contact your administrator."
              />
            ) : loading ? (
              <PageLoader label="Loading loan accounts…" />
            ) : apiError ? (
              <div className="py-4">
                <p className="pt-6 text-center font-display text-base font-semibold text-gray-800">
                  Connection Error
                </p>
                <ErrorState message={apiError} onRetry={loadList} />
              </div>
            ) : sortedList.length === 0 ? (
              <div className="flex flex-col items-center pb-8">
                <EmptyState
                  icon="🔍"
                  title="No Records Found"
                  hint="No loan accounts match your current search or filter criteria. Try adjusting your filters or clearing the search."
                />
                <button className="btn-secondary -mt-6" onClick={() => navigate({})}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <LeadsTable
                  rows={sortedList}
                  priorityEnabled={priorityEnabled}
                  currentPage={currentPage}
                  limit={limit}
                  sort={sort}
                  order={order}
                  onSort={onSort}
                  totalSanction={totalSanction}
                  totalRepayment={totalRepayment}
                  actions={rowActions}
                />
                {totalPages > 1 && (
                  <LeadsPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={total}
                    limit={limit}
                    onGotoPage={gotoPage}
                    onChangeLimit={(l) => navigate({ ...currentParams, limit: l, page: 1 })}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Slide-in Sort & Filter panel ── */}
      <SortFilterPanel
        open={sortFilterOpen}
        onClose={() => setSortFilterOpen(false)}
        currentParams={currentParams}
        search={search}
        onApply={(params) => { setSortFilterOpen(false); navigate(params); }}
      />

      {/* ── Modals & panels ── */}
      {pfCard && (
        <PortfolioCardModal cardKey={pfCard.key} label={pfCard.label} onClose={() => setPfCard(null)} />
      )}
      {ptp && <PtpModal lead={ptp} onClose={() => setPtp(null)} />}
      {assign && <AssignFieldModal lead={assign} onClose={() => setAssign(null)} />}
      {remarks && <RemarksModal lead={remarks} onClose={() => setRemarks(null)} />}
      {timeline && <ActivityTimelinePanel lead={timeline} onClose={() => setTimeline(null)} />}
      {loanHistory && <LoanHistoryModal lead={loanHistory} onClose={() => setLoanHistory(null)} />}
      {call && <CallModal lead={call} agentEmail={username} onClose={() => setCall(null)} />}
      {waChat && (
        <WhatsAppChatModal
          open
          mobile={waChat.mobile}
          name={waChat.name}
          onClose={() => setWaChat(null)}
        />
      )}
      {waTemplate && (
        <WhatsAppTemplateModal
          open
          name={waTemplate.name}
          mobile={waTemplate.mobile}
          loanId={waTemplate.loanId}
          repaymentAmount={waTemplate.repaymentAmount}
          repaymentDate={waTemplate.repaymentDate}
          onClose={() => setWaTemplate(null)}
        />
      )}
    </div>
  );
}
