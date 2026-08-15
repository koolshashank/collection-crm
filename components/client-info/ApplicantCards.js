"use client";

import { CiIcon } from "./icons";
import { SectionCard, TableWrap, Th, Td, CiEmpty } from "./SectionCard";
import { ciDate, ciSafe } from "./helpers";

/** Applicant Details — same 5 fields as the PHP page. */
export function ApplicantDetailsCard({ loan }) {
  const appFields = [
    ["Gender", loan.gender ?? ""],
    ["Date of Birth", ciDate(loan.dob ?? "")],
    ["Occupation", loan.occupation ?? ""],
    ["Aadhaar Number", loan.aadhaar ?? ""],
    ["PAN Number", loan.pan ?? ""],
  ];
  return (
    <SectionCard id="sec-applicant" icon="user" title="Applicant Details">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {appFields.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-3">
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-800">{ciSafe(value)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/** Applicant Address — table + UPI References button. */
export function AddressCard({ addressData, pan, onOpenUpi }) {
  return (
    <SectionCard
      id="sec-address"
      icon="pin"
      title="Applicant Address"
      action={
        <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={onOpenUpi}>
          <CiIcon name="card" size={13} strokeWidth={2} />
          UPI References
        </button>
      }
    >
      <TableWrap>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Address</Th>
              <Th>City</Th>
              <Th>State</Th>
              <Th>Pincode</Th>
            </tr>
          </thead>
          <tbody>
            {addressData && addressData.length ? (
              addressData.map((addr, i) => (
                <tr key={i} className="hover:bg-accent/5">
                  <Td>{ciSafe(addr.address_source ?? "")}</Td>
                  <Td>{ciSafe(addr.address ?? "")}</Td>
                  <Td>{ciSafe(addr.city ?? "")}</Td>
                  <Td>{ciSafe(addr.state ?? "")}</Td>
                  <Td>{ciSafe(addr.pincode ?? "")}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={5}>
                  <CiEmpty>No address found for PAN: {ciSafe(pan)}</CiEmpty>
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </SectionCard>
  );
}

/**
 * Documents — Sanction Letter / Aadhaar Card rows + role-gated
 * "More Documents" / "Complete Logs" buttons.
 * Rendered only for ADMIN | VISITOR | RECOVERY_HEAD | COLLECTION-HEAD |
 * COLLECTION-EXECUTIVE | ACCOUNTS (checked by the parent page).
 */
export function DocumentsCard({ loan, canSeeButtons, onMoreDocs, onCompleteLogs }) {
  const leadId = ciSafe(loan.lead_id);
  const docLink = "inline-block rounded bg-accent-light px-2 py-[3px] text-xs font-bold text-accent-dark no-underline hover:bg-accent hover:text-white";
  return (
    <SectionCard id="sec-docs" icon="doc" title="Documents">
      <TableWrap>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th>Document Type</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-accent/5">
              <Td>Sanction Letter</Td>
              <Td>
                <a
                  className={docLink}
                  href={`/api/docs/sanction?lead_id=${encodeURIComponent(leadId)}&doc_type=SANCTION_LETTER`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              </Td>
            </tr>
            <tr className="hover:bg-accent/5">
              <Td>Aadhaar Card</Td>
              <Td>
                <a
                  className={docLink}
                  href={`/api/docs/aadhar?lead_id=${encodeURIComponent(leadId)}&doc_type=AADHAAR`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              </Td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
      {canSeeButtons && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary !px-3.5 !py-1.5 !text-xs" onClick={onMoreDocs}>
            More Documents
          </button>
          <button className="btn-secondary !px-3.5 !py-1.5 !text-xs" onClick={onCompleteLogs}>
            Complete Logs
          </button>
        </div>
      )}
    </SectionCard>
  );
}
