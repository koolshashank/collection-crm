"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import {
  getStatusMeta,
  getPriority,
  getRoleFlags,
  ciDate,
} from "@/components/client-info/helpers";
import HeroSection from "@/components/client-info/HeroSection";
import ActionChips from "@/components/client-info/ActionChips";
import LoanDetailsCard from "@/components/client-info/LoanDetailsCard";
import { ApplicantDetailsCard, AddressCard, DocumentsCard } from "@/components/client-info/ApplicantCards";
import RepaymentHistoryCard from "@/components/client-info/RepaymentHistoryCard";
import PtpSection from "@/components/client-info/PtpSection";
import Sidebar from "@/components/client-info/Sidebar";
import RecommendedApproachCard from "@/components/client-info/RecommendedApproachCard";
import ClosedCelebration from "@/components/client-info/ClosedCelebration";
import UpiModal from "@/components/client-info/UpiModal";
import CollectionLogsModal from "@/components/client-info/CollectionLogsModal";
import UpdatePaymentModal from "@/components/client-info/UpdatePaymentModal";
import PayLinkModal from "@/components/client-info/PayLinkModal";
import BlockPanModal from "@/components/client-info/BlockPanModal";
import { DocListModal, LogsModal, AllDocsModal } from "@/components/client-info/DocsLogsModals";
import AssignFieldModal from "@/components/client-info/AssignFieldModal";
import CallModal from "@/components/client-info/CallModal";
import WhatsAppTemplateModal from "@/components/client-info/WhatsAppTemplateModal";

/**
 * Client Info — conversion of client_info.php.
 * Reads the same query param the PHP page did: ?lead_id=…
 */
function ClientInfoPage() {
  const searchParams = useSearchParams();
  const leadId = (searchParams.get("lead_id") || "").trim() || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loan, setLoan] = useState(null);
  const [addressData, setAddressData] = useState([]);
  const [mobileData, setMobileData] = useState([]);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      /* Session roles + loan details (step 1) */
      const [meRes, loanRes] = await Promise.all([
        clientFetch("/api/auth/me"),
        clientFetch(`/api/client/loan-details?lead_id=${encodeURIComponent(leadId)}`),
      ]);
      setRoles(meRes.data?.user?.roles || []);

      const loanDetails = loanRes.data?.data ?? null;
      if (!loanDetails) {
        setLoan(null);
        setError(`No details found for Lead ID: ${leadId}`);
        setLoading(false);
        return;
      }
      setLoan(loanDetails);

      /* Step 2: address + mobile IN PARALLEL (both use PAN) */
      const pan = loanDetails.pan ?? null;
      if (pan) {
        const [addrRes, mobRes] = await Promise.all([
          clientFetch(`/api/client/address?pan=${encodeURIComponent(pan)}`),
          clientFetch(`/api/client/mobile?pan=${encodeURIComponent(pan)}`),
        ]);
        setAddressData(addrRes.data?.result || []);
        setMobileData(mobRes.data?.result || []);
      } else {
        setAddressData([]);
        setMobileData([]);
      }
      setLoading(false);
    } catch {
      setError("Something went wrong while loading client info.");
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Derived meta (verbatim logic from the PHP page) ── */
  const derived = useMemo(() => {
    if (!loan) return null;
    const loanStatus = String(loan.loan_status || "").trim().toLowerCase();
    const dpdNum = parseInt(loan.overdue_days) || 0;
    let showSalaryAlert = false;
    if (loan.fixed_salary_date && loan.repayment_date) {
      showSalaryAlert = new Date(loan.fixed_salary_date).getTime() > new Date(loan.repayment_date).getTime();
    }
    return {
      statusMeta: getStatusMeta(loan.loan_status),
      priority: getPriority(dpdNum),
      isClosed: loanStatus === "closed",
      showSalaryAlert,
      pan: loan.pan ?? null,
    };
  }, [loan]);

  const flags = useMemo(() => getRoleFlags(roles), [roles]);

  if (!leadId) {
    return <ErrorState message="Invalid Lead ID." />;
  }
  if (loading) {
    return <PageLoader label="Loading client info…" />;
  }
  if (error || !loan || !derived) {
    return <ErrorState message={error || "Something went wrong."} onRetry={load} />;
  }

  const { isAdmin, isHead, isExec, isRHead, isVisitor, isAcm, isAccounts } = flags;
  const { statusMeta, priority, isClosed, showSalaryAlert, pan } = derived;

  const openModal = (id) => setModal(id);
  const closeModal = () => setModal(null);

  /* WhatsApp quick-action context — same args as lpOpenWhatsAppTemplate() */
  const waCtx = {
    name: loan.full_name ?? "",
    mobile: loan.mobile ?? "",
    loanId: loan.loan_no ?? "",
    repaymentAmount: Number(loan.repayment_amount ?? 0),
    repaymentDate: ciDate(loan.repayment_date ?? ""),
  };

  return (
    <div>
      {/* Confetti + success dialog for closed loan */}
      {isClosed && <ClosedCelebration collectionAmount={loan.collection_amount} />}

      <HeroSection loan={loan} leadId={leadId} statusMeta={statusMeta} priority={priority} />

      <ActionChips flags={flags} isClosed={isClosed} pan={pan} loan={loan} onOpen={openModal} />

      {/* Two-column one-page body */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── MAIN COLUMN ── */}
        <div className="min-w-0">
          <LoanDetailsCard loan={loan} showSalaryAlert={showSalaryAlert} />

          <ApplicantDetailsCard loan={loan} />

          <AddressCard addressData={addressData} pan={pan} onOpenUpi={() => openModal("upiModal")} />

          {(isAdmin || isVisitor || isRHead || isHead || isExec || isAccounts) && (
            <DocumentsCard
              loan={loan}
              canSeeButtons={isAdmin || isRHead || isHead || isExec}
              onMoreDocs={() => openModal("docListModal")}
              onCompleteLogs={() => openModal("logsModal")}
            />
          )}

          <RepaymentHistoryCard leadId={leadId} />

          {(isAdmin || isHead || isExec) && <PtpSection leadId={leadId} />}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="min-w-0">
          <RecommendedApproachCard leadId={leadId} loan={loan} />
          <Sidebar loan={loan} leadId={leadId} priority={priority} onQuickAction={openModal} />
        </div>
      </div>

      {/* ── MODALS ── */}
      <UpiModal open={modal === "upiModal"} onClose={closeModal} mobileData={mobileData} pan={pan} />

      <CollectionLogsModal open={modal === "collectionModal"} onClose={closeModal} leadId={leadId} />

      <UpdatePaymentModal
        open={modal === "repayModal"}
        onClose={closeModal}
        loan={loan}
        leadId={leadId}
        isClosed={isClosed}
      />

      <PayLinkModal open={modal === "payLinkModal"} onClose={closeModal} loan={loan} leadId={leadId} />

      <BlockPanModal open={modal === "blockPanModal"} onClose={closeModal} pan={pan} />

      <DocListModal open={modal === "docListModal"} onClose={closeModal} leadId={loan.lead_id ?? leadId} />

      <LogsModal open={modal === "logsModal"} onClose={closeModal} leadId={loan.lead_id ?? leadId} />

      <AllDocsModal open={modal === "allDocsModal"} onClose={closeModal} loan={loan} leadId={leadId} />

      <AssignFieldModal open={modal === "assignModal"} onClose={closeModal} loan={loan} leadId={leadId} />

      <CallModal open={modal === "callModal"} onClose={closeModal} loan={loan} leadId={leadId} />

      <WhatsAppTemplateModal open={modal === "waModal"} onClose={closeModal} ctx={waCtx} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoader label="Loading client info…" />}>
      <ClientInfoPage />
    </Suspense>
  );
}
