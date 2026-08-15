"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clientFetch } from "@/lib/clientFetch";
import { SectionCard, TableWrap, Th, Td, InlineSpinner, CiEmpty } from "./SectionCard";

/**
 * Repayment History — always visible, loads immediately.
 * Port of ciLoadRepayHistory() (fetch_payment.php?leadId=…).
 * Rows for the same lead are highlighted green, same as the PHP page.
 */
export default function RepaymentHistoryCard({ leadId }) {
  const [state, setState] = useState({ loading: true, error: false, rows: [] });

  const load = useCallback(async () => {
    setState({ loading: true, error: false, rows: [] });
    const res = await clientFetch(`/api/payments/fetch?leadId=${encodeURIComponent(leadId)}`);
    if (res.status === 0 || (!res.ok && !res.data)) {
      setState({ loading: false, error: true, rows: [] });
      return;
    }
    setState({ loading: false, error: false, rows: res.data?.data || [] });
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SectionCard id="sec-repay" icon="rupee" title="Repayment History">
      {state.loading ? (
        <InlineSpinner text="Loading payments…" />
      ) : state.error ? (
        <CiEmpty error>Failed to load payment history.</CiEmpty>
      ) : !state.rows.length ? (
        <CiEmpty>No repayment records found.</CiEmpty>
      ) : (
        <TableWrap>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Loan No</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Mode</Th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((p, i) => {
                const sameLead = p.is_same_lead === true || p.is_same_lead === "true";
                return (
                  <tr key={i} className={`hover:bg-accent/5 ${sameLead ? "font-semibold text-[#1E7E5E]" : ""}`}>
                    <Td>
                      {p.loan_no ? (
                        <Link
                          href={`/client-info?lead_id=${encodeURIComponent(p.lead_id)}`}
                          className="inline-block rounded bg-accent-light px-2 py-[3px] text-xs font-bold text-accent-dark no-underline hover:bg-accent hover:text-white"
                        >
                          {p.loan_no}
                        </Link>
                      ) : (
                        "--"
                      )}
                    </Td>
                    <Td>
                      <span className="font-bold text-[#1E7E5E]">
                        ₹{Number(p.received_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </Td>
                    <Td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : "--"}</Td>
                    <Td>{p.payment_method ? String(p.payment_method).toUpperCase() : "--"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </SectionCard>
  );
}
