"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { clientFetch } from "@/lib/clientFetch";
import { CiIcon } from "./icons";
import { buildCopyText, ciSafe } from "./helpers";

/**
 * Action Chips — Collection Logs, Update Payment, Reloan, Block PAN,
 * Pay Link toggle, Copy, Print. Role checks copied verbatim from
 * client_info.php. Pay-link toggle state persists in localStorage
 * (key: ci_paylink_enabled, default OFF) exactly like the PHP page.
 */
function Chip({ tone, icon, children, onClick, title }) {
  const tones = {
    teal: "bg-accent-light text-accent-dark hover:bg-accent hover:text-white",
    green: "bg-[#e8f5f0] text-[#14532d] hover:bg-[#1E7E5E] hover:text-white",
    amber: "bg-[#fdf3e3] text-[#8a5a12] hover:bg-amber hover:text-white",
    red: "bg-[#fbeaea] text-[#9c2b2b] hover:bg-danger hover:text-white",
    purple: "bg-[#f3e8fd] text-[#5b21b6] hover:bg-[#7c3aed] hover:text-white",
    slate: "bg-[#eef1f5] text-gray-600 hover:bg-navy hover:text-white",
  };
  const icTones = {
    teal: "bg-accent text-white",
    green: "bg-[#1E7E5E] text-white",
    amber: "bg-amber text-white",
    red: "bg-danger text-white",
    purple: "bg-[#7c3aed] text-white",
    slate: "bg-gray-500 text-white",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-bold shadow-sm transition-transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${tones[tone]}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${icTones[tone]}`}>
        <CiIcon name={icon} size={13} strokeWidth={2} />
      </span>
      {children}
    </button>
  );
}

export default function ActionChips({ flags, isClosed, pan, loan, onOpen }) {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin, isHead, isExec, isAcm } = flags;
  const [payLinkOn, setPayLinkOn] = useState(false);

  /* Restore saved state — default OFF */
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

  /* ── Reloan (verbatim: GET enable_reloan.php?pan=…) ── */
  async function reloan() {
    const res = await clientFetch(`/api/reloan/enable?pan=${encodeURIComponent(ciSafe(pan))}`);
    if (res.status === 0) return toast.error("Network error.");
    const d = res.data || {};
    if (d.success === true) toast.success(d.message || "Done");
    else toast.error(d.message || "Done");
  }

  /* ── Copy details ── */
  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(buildCopyText(loan));
      toast.success("Loan details copied!");
    } catch {
      toast.success("Copied!");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {(isAdmin || isHead || isExec || isAcm) && (
        <Chip tone="teal" icon="doc" onClick={() => onOpen("collectionModal")}>
          Collection Logs
        </Chip>
      )}
      {(isAdmin || isHead || isAcm) && (
        <Chip tone="green" icon="rupee" onClick={() => onOpen("repayModal")}>
          Update Payment
        </Chip>
      )}
      {(isAdmin || isAcm) && (
        <Chip tone="amber" icon="lock" onClick={reloan}>
          Reloan
        </Chip>
      )}
      {(isAdmin || isHead || isExec || isAcm) && (
        <Chip tone="red" icon="block" onClick={() => onOpen("blockPanModal")}>
          Block PAN
        </Chip>
      )}

      {!isClosed && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-2.5 text-xs font-bold transition-colors ${
            payLinkOn
              ? "border-[#1E7E5E] bg-[#f0faf4] text-[#1E7E5E]"
              : "border-line bg-panel text-[#1d4468]"
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
              <span
                className={`absolute inset-0 cursor-pointer rounded-full transition-colors ${
                  payLinkOn ? "bg-[#1E7E5E]" : "bg-line"
                }`}
              >
                <span
                  className="absolute bottom-[2px] left-[2px] h-3 w-3 rounded-full bg-white shadow transition-transform"
                  style={{ transform: payLinkOn ? "translateX(16px)" : "translateX(0)" }}
                />
              </span>
            </span>
          </label>
          {payLinkOn && (
            <button
              onClick={() => onOpen("payLinkModal")}
              className="ml-2 rounded-full bg-info px-2.5 py-[3px] text-[11px] font-bold text-white"
            >
              Generate
            </button>
          )}
        </div>
      )}

      <Chip tone="purple" icon="copy" onClick={copyDetails} title="Copy loan summary">
        Copy
      </Chip>
      <Chip
        tone="teal"
        icon="camera"
        onClick={() => router.push(`/customer-one-pager?lead_id=${encodeURIComponent(loan.lead_id ?? "")}`)}
        title="Full customer summary — print or download as PDF"
      >
        One Pager
      </Chip>
      <Chip tone="slate" icon="print" onClick={() => window.print()} title="Print this page">
        Print
      </Chip>
    </div>
  );
}
