"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/clientFetch";

/**
 * NOC document preview — port of noc.php's buildNOCHtml().
 * Mirrors the PDF exactly: same title, meta rows, paragraph order and
 * wording, remarks note, regards block and system-generated stamp.
 * Header/footer images default to /assets but reflect whatever has been
 * uploaded in Settings → Document Header & Footer (hidden on load error,
 * same as the PHP's onerror handlers).
 */

const DEFAULT_HEADER_URL = "/assets/noc_header.jpg";
const DEFAULT_FOOTER_URL = "/assets/noc_Footer.jpg";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Format: dd-Mon-yyyy  (same as PHP date('d-M-Y')) */
function fmtDMY(s) {
  if (!s) return "—";
  const x = new Date(s);
  if (isNaN(x)) return s;
  return String(x.getDate()).padStart(2, "0") + "-" + MONTHS[x.getMonth()] + "-" + x.getFullYear();
}

/* Amount: Rs. X,XX,XXX.XX */
function fmtRs(n) {
  n = parseFloat(n) || 0;
  return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const hideOnError = (e) => {
  e.currentTarget.style.display = "none";
};

export default function NocDocPreview({ d, nocDate, remarks }) {
  const [assets, setAssets] = useState({ headerUrl: DEFAULT_HEADER_URL, footerUrl: DEFAULT_FOOTER_URL });

  useEffect(() => {
    let active = true;
    clientFetch("/api/config/document-header-footer").then((res) => {
      if (!active || !res.ok || !res.data?.success) return;
      const cfg = res.data.config ?? {};
      const cacheBust = cfg.updatedAt ? `?v=${encodeURIComponent(cfg.updatedAt)}` : "";
      setAssets({
        headerUrl: (cfg.headerUrl || DEFAULT_HEADER_URL) + cacheBust,
        footerUrl: (cfg.footerUrl || DEFAULT_FOOTER_URL) + cacheBust,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  if (!d) return null;

  const dateDisp = fmtDMY(nocDate || new Date().toISOString().split("T")[0]);
  const collDisp = fmtDMY(d.collection_date);

  const displayAmt = parseFloat(d.repayment_amount) > 0 ? d.repayment_amount : d.collection_amount;
  const collAmt = parseFloat(d.collection_amount) > 0 ? d.collection_amount : displayAmt;

  const trimmedRemarks = (remarks || "").trim();

  return (
    <div className="mx-auto max-w-[640px] overflow-hidden rounded-lg border border-gray-300 bg-white font-[Arial,sans-serif] text-[#1a1a1a] shadow-lg">
      {/* Header image */}
      <div className="block w-full leading-none">
        <img
          src={assets.headerUrl}
          alt="BlinkR Loan | Dev-Aashish Capitals Pvt. Ltd."
          className="block h-auto w-full"
          onError={hideOnError}
        />
      </div>

      <div className="px-6 pt-7 sm:px-10">
        <div className="mb-4 text-center text-base font-bold uppercase tracking-[.1em] text-[#0d3464] underline">
          No Objection Certificate
        </div>

        <div className="mb-1.5 text-sm font-bold">Dear Mr. {d.full_name || "Borrower"},</div>
        <div className="mb-4 text-[13px] italic text-gray-600">Greetings!</div>

        <div className="mb-1 text-[13px] text-gray-700">
          <strong className="inline-block min-w-[130px] text-[#0d3464]">Loan Account No.:</strong> {d.loan_no || "—"}
        </div>
        <div className="mb-1 text-[13px] text-gray-700">
          <strong className="inline-block min-w-[130px] text-[#0d3464]">PAN:</strong> {d.pan || "—"}
        </div>
        <div className="mb-1 text-[13px] text-gray-700">
          <strong className="inline-block min-w-[130px] text-[#0d3464]">Date:</strong> {dateDisp}
        </div>

        <p className="mb-4 mt-4 text-justify text-[13px] leading-[1.9]">
          This is to certify that you have availed a loan facility bearing Loan Account Number{" "}
          <strong className="text-[#0d3464]">{d.loan_no || "—"}</strong> from{" "}
          <strong className="text-[#0d3464]">BlinkR Loan</strong>, a brand of RBI Registered NBFC:{" "}
          <strong className="text-[#0d3464]">Dev-Aashish Capitals Private Limited</strong>.
        </p>

        <p className="mb-4 text-justify text-[13px] leading-[1.9]">
          We hereby confirm that the aforesaid loan account has been fully closed on{" "}
          <strong className="text-[#0d3464]">{collDisp}</strong> upon receipt of the entire repayment amount due and
          payable against the said loan account as per Loan Agreement.
        </p>

        <p className="mb-4 text-justify text-[13px] leading-[1.9]">
          The amount of <strong className="text-[#0d3464]">{fmtRs(collAmt)}</strong> was collected on{" "}
          <strong className="text-[#0d3464]">{collDisp}</strong> against the said loan account.
        </p>

        <p className="mb-4 text-justify text-[13px] leading-[1.9]">
          As on date, there are no outstanding dues, liabilities, or obligations payable by you in respect of the
          above-mentioned loan account.
        </p>

        <p className="mb-4 text-justify text-[13px] leading-[1.9]">
          The Company has no objection to the closure of the said loan account.
        </p>

        <p className="mb-4 text-justify text-[13px] leading-[1.9]">
          This No Objection Certificate is issued at your request for your record and future reference.
        </p>

        {trimmedRemarks ? (
          <p className="mb-4 text-justify text-[13px] leading-[1.9]">
            <em>Note: {trimmedRemarks}</em>
          </p>
        ) : null}

        <div className="mt-7 text-[13px] leading-[1.8]">
          Regards,
          <br />
          <div className="text-sm font-bold text-[#0d3464]">Team BlinkR Loan</div>
          <img
            src="/assets/Logo_BlinkR.png"
            alt="BlinkR Loan"
            className="mt-1.5 block h-[38px] w-auto"
            onError={hideOnError}
          />
          <div className="mt-0.5 text-xs text-gray-600">DEV-AASHISH CAPITALS PRIVATE LIMITED (NBFC)</div>
        </div>

        <div className="py-3 pt-4 text-center text-[11px] italic text-gray-400">
          This document is system-generated and does not require a physical signature &nbsp;|&nbsp; {dateDisp}
        </div>
      </div>

      {/* Footer image (file on disk is noc_Footer.jpg) */}
      <div className="mt-6 block w-full leading-none">
        <img
          src={assets.footerUrl}
          alt="RBI Registered NBFC"
          className="block h-auto w-full"
          onError={hideOnError}
        />
      </div>
    </div>
  );
}
