"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import OnePagerView from "@/components/one-pager/OnePagerView";

function CustomerOnePagerContent() {
  const searchParams = useSearchParams();
  const leadId = (searchParams.get("lead_id") || "").trim() || null;
  return <OnePagerView leadId={leadId} />;
}

export default function CustomerOnePagerPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading customer summary…" />}>
      <CustomerOnePagerContent />
    </Suspense>
  );
}
