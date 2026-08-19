"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import BsaReportView from "@/components/bsa-report/BsaReportView";

function BsaReportContent() {
  const searchParams = useSearchParams();
  const leadId = (searchParams.get("lead_id") || "").trim() || null;
  return <BsaReportView leadId={leadId} />;
}

export default function BsaReportPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading BSA report…" />}>
      <BsaReportContent />
    </Suspense>
  );
}
