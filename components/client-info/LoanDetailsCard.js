"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CiIcon } from "./icons";
import { SectionCard, SubGroup, InfoField } from "./SectionCard";
import { ciDate, ciInr, ciSafe } from "./helpers";

/**
 * Loan & Repayment Details — grouped field grid + Screenshot button.
 * Field groups, labels and values are verbatim from client_info.php.
 * Screenshot uses html2canvas (dynamically imported), filename
 * <LoanNo>_attributes_<YYYY-MM-DD>.png — same as the PHP page.
 */
export default function LoanDetailsCard({ loan, showSalaryAlert }) {
  const toast = useToast();
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const grpTerms = [
    ["rupee", "Loan Amount", ciInr(loan.loan_amount ?? 0)],
    ["clock", "Loan Tenure", `${loan.tenure ?? "--"} Days`],
    ["rupee", "ROI", `${loan.roi ?? "--"}%`],
    ["cal", "Sanction Date", ciDate(loan.sanction_date)],
    ["hash", "Loan Type", loan.loan_type ?? ""],
    ["hash", "Product Type", loan.product_type ?? "Blinkr Loan"],
  ];
  const grpRepay = [
    ["cash", "Repayment Amount", ciInr(loan.repayment_amount ?? 0)],
    ["calcheck", "Repayment Date", ciDate(loan.repayment_date)],
    ["salary", "Salary Date", ciDate(loan.fixed_salary_date), showSalaryAlert],
    ["today", "Payment Today", ciInr(loan.ontime_repayment_amount ?? 0)],
  ];
  const grpRecovery = [
    ["collected", "Collected Amt", ciInr(loan.collection_amount ?? 0)],
    ["calcheck", "Collection Date", ciDate(loan.collection_date)],
    ["hourglass", "Overdue Days", loan.overdue_days ?? "--"],
    ["warn", "Overdue Amount", ciInr(loan.penalty_amount ?? 0)],
    ["waiver", "Waiver Amount", ciInr(loan.waiver_amount ?? 0)],
  ];
  const grpBank = [
    ["hash", "Bank Acc No", loan.bank_acc_no ?? ""],
    ["hash", "IFSC Code", loan.ifsc_code ?? ""],
    ["cash", "Admin Fee", ciInr(loan.admin_fee ?? 0)],
    ["rupee", "Net Disbursal", ciInr(loan.net_disbursal ?? 0)],
  ];

  async function captureAttributes() {
    if (!cardRef.current) {
      toast.error("Section not found.");
      return;
    }
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, /* retina quality */
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc) => {
          /* Remove the screenshot button from the clone */
          const clonedHead = clonedDoc.getElementById("ci-loan-card-head");
          if (clonedHead) {
            clonedHead.querySelectorAll("button").forEach((b) => (b.style.display = "none"));
          }
        },
      });
      const loanNo = loan.loan_no || "loan";
      const today = new Date().toISOString().split("T")[0];
      const fname = String(loanNo).replace(/[^a-zA-Z0-9_-]/g, "_") + "_attributes_" + today + ".png";
      const link = document.createElement("a");
      link.download = fname;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Screenshot saved as " + fname);
    } catch (err) {
      console.error("html2canvas error:", err);
      toast.error("Screenshot failed. Try again.");
    } finally {
      setCapturing(false);
    }
  }

  const groups = [
    { label: "Loan Terms", fields: grpTerms },
    { label: "Repayment Schedule", fields: grpRepay },
    { label: "Collection & Recovery", fields: grpRecovery },
    { label: "Bank & Fees", fields: grpBank },
  ];

  return (
    <div ref={cardRef}>
      <SectionCard
        id="sec-loan"
        icon="user"
        title="Loan & Repayment Details"
        action={
          <span id="ci-loan-card-head">
            <button
              className="btn-secondary !px-3 !py-1.5 !text-xs"
              onClick={captureAttributes}
              disabled={capturing}
              title="Screenshot this section"
            >
              <CiIcon name={capturing ? "spinner" : "camera"} size={13} strokeWidth={2} className={capturing ? "animate-spin" : ""} />
              {capturing ? "Capturing…" : "Screenshot"}
            </button>
          </span>
        }
      >
        {groups.map((g, gi) => (
          <SubGroup key={g.label} label={g.label} first={gi === 0}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {g.fields.map(([icon, label, value, alert]) => (
                <InfoField key={label} icon={icon} label={label} value={ciSafe(value)} alert={!!alert} />
              ))}
            </div>
          </SubGroup>
        ))}
      </SectionCard>
    </div>
  );
}
