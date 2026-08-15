"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { InfoField } from "@/components/client-info/SectionCard";
import { CiIcon } from "@/components/client-info/icons";
import { ciSafe, ciDate, ciInr, getStatusMeta, getRoleFlags } from "@/components/client-info/helpers";
import BlockPanModal from "@/components/client-info/BlockPanModal";
import PayLinkModal from "@/components/client-info/PayLinkModal";
import UpdatePaymentModal from "@/components/client-info/UpdatePaymentModal";
import CollectionLogsModal from "@/components/client-info/CollectionLogsModal";
import PtpSection from "@/components/client-info/PtpSection";
import InsightTab from "@/components/one-pager/InsightTab";

const TABS = [
  { key: "personal", label: "Personal Info" },
  { key: "loan", label: "Loan & Repayment" },
  { key: "ptp", label: "PTP History" },
  { key: "docs", label: "Documents & History" },
  { key: "insight", label: "Insight" },
];

/** Small icon+label pill button — same visual language as the client-info ActionChips. */
function OpChip({ tone, icon, children, onClick, disabled, title }) {
  const tones = {
    teal: "bg-accent-light text-accent-dark hover:bg-accent hover:text-white",
    slate: "bg-[#eef1f5] text-gray-600 hover:bg-navy hover:text-white",
    amber: "bg-[#fdf3e3] text-[#8a5a12] hover:bg-amber hover:text-white",
    red: "bg-[#fbeaea] text-[#9c2b2b] hover:bg-danger hover:text-white",
    green: "bg-[#e8f5f0] text-[#14532d] hover:bg-[#1E7E5E] hover:text-white",
  };
  const icTones = {
    teal: "bg-accent text-white",
    slate: "bg-gray-500 text-white",
    amber: "bg-amber text-white",
    red: "bg-danger text-white",
    green: "bg-[#1E7E5E] text-white",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-bold shadow-sm transition-transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-60 ${tones[tone]}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${icTones[tone]}`}>
        <CiIcon name={icon} size={13} strokeWidth={2} />
      </span>
      {children}
    </button>
  );
}

/**
 * Customer One Pager — a real page (not a modal), so it renders inside the
 * normal AppShell: sidebar + header stay exactly where they always are.
 * Layout/tabs are modelled on a clean HR-profile design; colours use the
 * CRM's own teal/navy theme.
 *
 * Usage: /customer-one-pager?lead_id=…
 *   - From the leads table: Loan ID link points straight here.
 *   - From client-info: the "One Pager" chip links here too.
 *
 * ⚠️ CUSTOMER PHOTO: still a placeholder — swap the circle's contents for
 * a real <img> once the team confirms where the photo comes from.
 */
export default function OnePagerView({ leadId }) {
  const router = useRouter();
  const toast = useToast();
  const printRef = useRef(null);
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loan, setLoan] = useState(null);
  const [addressData, setAddressData] = useState([]);
  const [history, setHistory] = useState({ loading: false, loaded: false, error: false, rows: [] });
  const [roles, setRoles] = useState([]);
  const [payLinkOn, setPayLinkOn] = useState(false);
  const [openModal, setOpenModal] = useState(null); // "blockPan" | "payLink" | "updatePayment" | "collectionLogs"

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

  /* Reloan — verbatim: GET enable_reloan.php?pan=… */
  async function reloan() {
    const res = await clientFetch(`/api/reloan/enable?pan=${encodeURIComponent(ciSafe(loan?.pan))}`);
    if (res.status === 0) return toast.error("Network error.");
    const d = res.data || {};
    if (d.success === true) toast.success(d.message || "Done");
    else toast.error(d.message || "Done");
  }

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [meRes, loanRes] = await Promise.all([
        clientFetch("/api/auth/me"),
        clientFetch(`/api/client/loan-details?lead_id=${encodeURIComponent(leadId)}`),
      ]);
      if (cancelled) return;
      setRoles(meRes.data?.user?.roles || []);
      const loanDetails = loanRes.data?.data ?? null;
      if (!loanDetails) {
        setError(`No details found for Lead ID: ${leadId}`);
        setLoading(false);
        return;
      }
      setLoan(loanDetails);
      if (loanDetails.pan) {
        const addrRes = await clientFetch(`/api/client/address?pan=${encodeURIComponent(loanDetails.pan)}`);
        if (!cancelled) setAddressData(addrRes.data?.result || []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  /* Lazy-load repayment history only when that tab is opened */
  useEffect(() => {
    if (tab !== "docs" || !leadId || history.loaded || history.loading) return;
    let cancelled = false;
    (async () => {
      setHistory((h) => ({ ...h, loading: true }));
      const res = await clientFetch(`/api/payments/fetch?leadId=${encodeURIComponent(leadId)}`);
      if (cancelled) return;
      if (res.status === 0 || (!res.ok && !res.data)) {
        setHistory({ loading: false, loaded: true, error: true, rows: [] });
      } else {
        setHistory({ loading: false, loaded: true, error: false, rows: res.data?.data || [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, leadId, history.loaded, history.loading]);

  if (!leadId) return <ErrorState message="Invalid Lead ID." />;
  if (loading) return <PageLoader label="Loading customer summary…" />;
  if (error || !loan) return <ErrorState message={error || "Something went wrong."} />;

  const statusMeta = getStatusMeta(loan.loan_status);
  const { isAdmin, isHead, isExec, isAcm } = getRoleFlags(roles);
  const isClosed = String(loan.loan_status || "").trim().toLowerCase() === "closed";

  const references = [1, 2]
    .map((n) => ({
      name: loan[`reference_name_${n}`],
      relation: loan[`ref_relation_${n}`],
      contact: loan[`mobile_number_${n}`],
    }))
    .filter((r) => r.name || r.contact);

  const agentName = loan.collection_assigned_to_agent_name ?? loan.agent_name ?? loan.emp_name ?? null;

  const infoCell = (label, value) => (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-gray-800">{value ?? "--"}</div>
    </div>
  );

  const kvRow = (label, value) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 text-[12.5px] last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-800">{value ?? "--"}</span>
    </div>
  );

  const card = (title, children, extraClass = "") => (
    <div className={`card p-4 ${extraClass}`}>
      <h4 className="mb-3 text-[13px] font-bold text-gray-800">{title}</h4>
      {children}
    </div>
  );

  const docLink = "inline-block rounded bg-accent-light px-2.5 py-1 text-xs font-bold text-accent-dark no-underline hover:bg-accent hover:text-white";

  return (
    <div>
      {/* Page header — breadcrumb + actions (this whole block is hidden on print) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <button type="button" onClick={() => router.back()} className="mb-1 text-xs font-semibold text-accent-dark hover:underline">
            ← Back
          </button>
          <h1 className="font-display text-xl font-bold text-gray-800">Customer One Pager</h1>
          <p className="text-xs text-gray-400">
            <Link href="/leads" className="text-accent-dark no-underline hover:underline">
              Leads
            </Link>{" "}
            / {ciSafe(loan.full_name)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isHead || isExec || isAcm) && (
            <OpChip tone="teal" icon="doc" onClick={() => setOpenModal("collectionLogs")}>
              Collection Logs
            </OpChip>
          )}
          {(isAdmin || isHead || isAcm) && (
            <OpChip tone="green" icon="rupee" onClick={() => setOpenModal("updatePayment")}>
              Update Payment
            </OpChip>
          )}
          {(isAdmin || isAcm) && (
            <OpChip tone="amber" icon="lock" onClick={reloan}>
              Reloan
            </OpChip>
          )}
          {(isAdmin || isHead || isExec || isAcm) && (
            <OpChip tone="red" icon="block" onClick={() => setOpenModal("blockPan")}>
              Block PAN
            </OpChip>
          )}
          {!isClosed && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-2.5 text-xs font-bold transition-colors ${
                payLinkOn ? "border-[#1E7E5E] bg-[#f0faf4] text-[#1E7E5E]" : "border-line bg-panel text-[#1d4468]"
              }`}
            >
              <label className="m-0 flex cursor-pointer select-none items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info text-white">
                  <CiIcon name="link" size={13} strokeWidth={2} />
                </span>
                <span className="whitespace-nowrap">Pay Link</span>
                <span className="relative ml-0.5 inline-block h-[17px] w-[30px] shrink-0">
                  <input
                    type="checkbox"
                    checked={payLinkOn}
                    onChange={(e) => togglePayLink(e.target.checked)}
                    className="absolute h-0 w-0 opacity-0"
                  />
                  <span className={`absolute inset-0 cursor-pointer rounded-full transition-colors ${payLinkOn ? "bg-[#1E7E5E]" : "bg-line"}`}>
                    <span
                      className="absolute bottom-[2px] left-[2px] h-3 w-3 rounded-full bg-white shadow transition-transform"
                      style={{ transform: payLinkOn ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </span>
                </span>
              </label>
              {payLinkOn && (
                <button
                  onClick={() => setOpenModal("payLink")}
                  className="ml-2 rounded-full bg-info px-2.5 py-[3px] text-[11px] font-bold text-white"
                >
                  Generate
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-line print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "border-accent text-accent-dark" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PRINTABLE CONTENT ── */}
      <div id="one-pager-print" ref={printRef}>
        {/* Identity strip — shown on every tab */}
        <div className="card mb-4 flex items-center gap-4 p-4">
          {/* ⚠️ PLACEHOLDER — swap for <img src={...} className="h-16 w-16 rounded-full object-cover" /> once the photo source is confirmed */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-surface text-xl">
            🖼️
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-800">{ciSafe(loan.full_name)}</div>
            <div className="text-xs font-semibold text-gray-600">
              {ciSafe(loan.loan_no)} · Lead {ciSafe(leadId)} ·{" "}
              <span style={{ color: statusMeta.color }}>{statusMeta.label}</span>
            </div>
          </div>
        </div>

        <h2 className="mb-3 text-base font-bold text-gray-800 print:hidden">{TABS.find((t) => t.key === tab)?.label}</h2>

        {/* ── TAB: Personal Info ── */}
        {tab === "personal" && (
          <>
            {card(
              "Basic information",
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <div className="space-y-1.5 text-[12.5px] text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span>⚥</span> {ciSafe(loan.gender)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>✉</span> {ciSafe(loan.personal_email ?? loan.office_email)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>☎</span> {ciSafe(loan.mobile)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-3 sm:col-span-1 sm:grid-cols-1">
                  {infoCell("Date of Birth", ciDate(loan.dob))}
                  {infoCell("Occupation", ciSafe(loan.occupation))}
                </div>
                <div className="grid grid-cols-2 gap-y-3 sm:col-span-1 sm:grid-cols-1">
                  {infoCell("PAN Number", ciSafe(loan.pan))}
                  {infoCell("Aadhaar Number", ciSafe(loan.aadhaar))}
                </div>
              </div>,
              "mb-4"
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {card(
                "Address",
                addressData.length > 0 ? (
                  <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                    {addressData.map((a, i) => (
                      <div key={i} className="border-b border-gray-100 pb-2 text-[12.5px] text-gray-700 last:border-0 last:pb-0">
                        {ciSafe([a.address, a.city, a.state, a.pincode].filter(Boolean).join(", "), "--")}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-gray-400">No address on record.</p>
                )
              )}

              {card(
                "Emergency contact",
                references.length > 0 ? (
                  <div className="space-y-4">
                    {references.map((r, i) => (
                      <div key={i} className={i > 0 ? "border-t border-gray-100 pt-3" : ""}>
                        <div className="mb-1.5 inline-block rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent-dark">
                          Reference {i + 1}
                        </div>
                        {kvRow("Name", ciSafe(r.name))}
                        {kvRow("Relationship", ciSafe(r.relation))}
                        {kvRow("Phone number", ciSafe(r.contact))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-gray-400">No reference on record.</p>
                )
              )}
            </div>
          </>
        )}

        {/* ── TAB: Loan & Repayment ── */}
        {tab === "loan" && (
          <div className="space-y-5">
            {[
              {
                label: "Loan Overview",
                fields: [
                  ["hash", "Loan No", ciSafe(loan.loan_no)],
                  ["user", "Applicant Name", ciSafe(loan.full_name)],
                  ["phone", "Mobile Number", ciSafe(loan.mobile)],
                  ["phone", "Alternate Mobile", ciSafe(loan.alternate_mobile)],
                ],
              },
              {
                label: "Loan Terms",
                fields: [
                  ["rupee", "Loan Amount", ciInr(loan.loan_amount ?? 0)],
                  ["clock", "Loan Tenure", `${ciSafe(loan.tenure)} Days`],
                  ["rupee", "ROI", `${ciSafe(loan.roi)}%`],
                  ["cal", "Sanction Date", ciDate(loan.sanction_date)],
                  ["hash", "Loan Type", ciSafe(loan.loan_type)],
                  ["hash", "Product Type", loan.product_type ?? "Blinkr Loan"],
                ],
              },
              {
                label: "Repayment Schedule",
                fields: [
                  ["cash", "Repayment Amount", ciInr(loan.repayment_amount ?? 0)],
                  ["calcheck", "Repayment Date", ciDate(loan.repayment_date), "blue"],
                  ["salary", "Salary Date", ciDate(loan.fixed_salary_date), "purple"],
                  ["today", "Payment Today", ciInr(loan.ontime_repayment_amount ?? 0), "rose"],
                ],
              },
              {
                label: "Collection & Recovery",
                fields: [
                  ["collected", "Collected Amt", ciInr(loan.collection_amount ?? 0)],
                  ["calcheck", "Collection Date", ciDate(loan.collection_date)],
                  ["hourglass", "Overdue Days", ciSafe(loan.overdue_days)],
                  ["warn", "Overdue Amount", ciInr(loan.penalty_amount ?? 0)],
                  ["waiver", "Waiver Amount", ciInr(loan.waiver_amount ?? 0)],
                  ["users", "Assigned Agent", ciSafe(agentName)],
                ],
              },
              {
                label: "Bank & Fees",
                fields: [
                  ["hash", "Bank Acc No", ciSafe(loan.bank_acc_no)],
                  ["hash", "IFSC Code", ciSafe(loan.ifsc_code)],
                  ["cash", "Admin Fee", ciInr(loan.admin_fee ?? 0)],
                  ["rupee", "Net Disbursal", ciInr(loan.net_disbursal ?? 0)],
                ],
              },
            ].map((g) => (
              <div key={g.label}>
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
                  <span className="inline-block h-[13px] w-1 rounded bg-accent" />
                  {g.label}
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                  {g.fields.map(([icon, label, value, tone]) => (
                    <InfoField key={label} icon={icon} label={label} value={value} tone={tone} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: PTP History ── */}
        {tab === "ptp" && <PtpSection leadId={leadId} />}

        {/* ── TAB: Insight ── */}
        {tab === "insight" && <InsightTab leadId={leadId} loan={loan} />}

        {/* ── TAB: Documents & History ── */}
        {tab === "docs" && (
          <div className="space-y-4">
            {card(
              "Documents",
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-surface text-left text-gray-500">
                      <th className="px-3 py-1.5 font-semibold">Document Type</th>
                      <th className="px-3 py-1.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-700">Sanction Letter</td>
                      <td className="px-3 py-1.5">
                        <a
                          className={docLink}
                          href={`/api/docs/sanction?lead_id=${encodeURIComponent(loan.lead_id ?? leadId ?? "")}&doc_type=SANCTION_LETTER`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-700">Aadhaar Card</td>
                      <td className="px-3 py-1.5">
                        <a
                          className={docLink}
                          href={`/api/docs/aadhar?lead_id=${encodeURIComponent(loan.lead_id ?? leadId ?? "")}&doc_type=AADHAAR`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {card(
              "Repayment history",
              history.loading ? (
                <p className="text-[12.5px] text-gray-400">Loading payment history…</p>
              ) : history.error ? (
                <p className="text-[12.5px] text-danger">Failed to load payment history.</p>
              ) : history.rows.length === 0 ? (
                <p className="text-[12.5px] text-gray-400">No repayment records found.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="bg-surface text-left text-gray-500">
                        <th className="px-3 py-1.5 font-semibold">Loan No</th>
                        <th className="px-3 py-1.5 font-semibold">Amount</th>
                        <th className="px-3 py-1.5 font-semibold">Date</th>
                        <th className="px-3 py-1.5 font-semibold">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.rows.map((p, i) => {
                        const sameLead = p.is_same_lead === true || p.is_same_lead === "true";
                        return (
                          <tr key={i} className={`border-t border-gray-100 ${sameLead ? "font-semibold text-[#1E7E5E]" : "text-gray-700"}`}>
                            <td className="px-3 py-1.5">
                              {p.loan_no ? (
                                <Link href={`/client-info?lead_id=${encodeURIComponent(p.lead_id)}`} className={docLink}>
                                  {p.loan_no}
                                </Link>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-3 py-1.5">{ciInr(p.amount ?? 0)}</td>
                            <td className="px-3 py-1.5">{ciDate(p.date)}</td>
                            <td className="px-3 py-1.5">{ciSafe(p.mode)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        <div className="mt-4 text-center text-[10px] text-gray-400">
          This is a system-generated summary from Collection CRM — for internal use only.
        </div>
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
    </div>
  );
}
