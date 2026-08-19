"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { ciSafe } from "./helpers";

/**
 * Generate Payment Link modal + result modal.
 * Port of payLinkModal / payLinkResultModal + ciSendPaymentLink() /
 * ciRefreshGateways(). Gateway visibility refreshes from
 * /api/config/gateway (gateway_config.php) each time the modal opens.
 * Payloads are byte-for-byte identical to the PHP page.
 */
export default function PayLinkModal({ open, onClose, loan, leadId }) {
  const toast = useToast();
  const fullAmt = loan.ontime_repayment_amount ?? 0;

  const [gw, setGw] = useState({ payu: true, paytm: true });
  const [type, setType] = useState("full");
  const [amount, setAmount] = useState(String(fullAmt ?? ""));
  const [via, setVia] = useState("both");
  const [gateway, setGateway] = useState("payu");
  const [payuMethod, setPayuMethod] = useState("upi");
  const [sending, setSending] = useState(false);
  const [resultLink, setResultLink] = useState(null);

  /* ── GATEWAY LIVE REFRESH — every time the modal opens ── */
  useEffect(() => {
    if (!open) return;
    setType("full");
    setAmount(String(fullAmt ?? ""));
    setVia("both");
    setPayuMethod("upi");
    (async () => {
      const res = await clientFetch("/api/config/gateway");
      if (!res.data?.success) return; /* silent fail — keep existing state */
      const cfg = res.data.config || {};
      const payuOn = !!cfg.payu;
      const paytmOn = !!cfg.paytm;
      setGw({ payu: payuOn, paytm: paytmOn });
      /* Fix checked radio — if PayU disabled but was selected, switch */
      setGateway((cur) => {
        if (cur === "payu" && !payuOn && paytmOn) return "paytm";
        if (cur === "paytm" && !paytmOn && payuOn) return "payu";
        if (payuOn) return cur === "paytm" && paytmOn ? "paytm" : cur;
        if (paytmOn) return "paytm";
        return cur;
      });
    })();
  }, [open, fullAmt]);

  function payTypeChange(sel) {
    setType(sel);
    if (sel === "full") setAmount(String(fullAmt ?? ""));
    else setAmount("");
  }

  /* ── ciSendPaymentLink — identical payloads ── */
  async function sendPaymentLink() {
    const lead_id = parseInt(leadId, 10);
    const amt = parseFloat(amount || 0);
    if (type === "partial" && (!amt || amt <= 0)) return toast.error("Enter a valid partial amount.");

    let url, payload;
    if (gateway === "paytm") {
      url = "/api/payment-link/paytm";
      payload = {
        lead_id,
        sms: via === "sms" || via === "both",
        email: via === "email" || via === "both",
        full_payment: type === "full",
        partial_amount: type === "full" ? 0 : amt,
        success_url: "https://api.blinkrloan.com/success",
        failure_url: "https://api.blinkrloan.com/failure",
      };
    } else {
      url = "/api/payment-link/payu";
      payload = {
        lead_id,
        partial_amount: type === "full" ? 0 : amt,
        full_payment: type === "full",
        sms: via === "sms" || via === "both",
        email: via === "email" || via === "both",
        payment_through: gateway,
        payu_method: payuMethod,
      };
    }

    setSending(true);
    const res = await postJson(url, payload);
    setSending(false);
    if (res.status === 0) return toast.error("Network error.");
    if (!res.data?.success) return toast.error(res.data?.message || "Failed to generate link.");
    const d = res.data.data || {};
    const link = d.PaymentLink || d.payment_link || d.link || "";
    onClose();
    setResultLink(link);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resultLink || "");
      toast.success("Link copied!");
    } catch {}
    postJson("/api/activity/log", {
      action: "payment_link_copied",
      entity: { type: "lead", id: leadId ?? loan.lead_id ?? null },
      meta: { loan_no: loan.loan_no ?? null },
    }).catch(() => {});
  }

  const radio = "h-[15px] w-[15px] accent-accent";
  const radioLabel = "flex cursor-pointer items-center gap-1.5 text-sm text-gray-600";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Generate Payment Link"
        footer={
          <>
            <button className="btn-secondary" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button className="btn bg-[#1E7E5E] text-white hover:bg-[#165f47]" onClick={sendPaymentLink} disabled={sending}>
              {sending ? "Sending…" : "Send Link"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="label">Loan Number</label>
            <input className="input bg-surface" value={ciSafe(loan.loan_no)} readOnly />
          </div>
          <div>
            <label className="label">Customer Name</label>
            <input className="input bg-surface" value={ciSafe(loan.full_name)} readOnly />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-surface" value={ciSafe(loan.personal_email ?? "")} readOnly />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input bg-surface" value={ciSafe(loan.mobile ?? "")} readOnly />
          </div>

          <div>
            <label className="label">Payment Type</label>
            <div className="mt-1 flex flex-wrap gap-5">
              <label className={radioLabel}>
                <input type="radio" name="pl-type" className={radio} value="full" checked={type === "full"} onChange={() => payTypeChange("full")} />
                Full Payment
              </label>
              <label className={radioLabel}>
                <input type="radio" name="pl-type" className={radio} value="partial" checked={type === "partial"} onChange={() => payTypeChange("partial")} />
                Partial Payment
              </label>
            </div>
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              className={`input ${type === "full" ? "bg-surface" : ""}`}
              type="number"
              value={amount}
              readOnly={type === "full"}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Send Via</label>
            <div className="mt-1 flex flex-wrap gap-5">
              {[["both", "Both"], ["email", "Email Only"], ["sms", "SMS Only"]].map(([v, l]) => (
                <label key={v} className={radioLabel}>
                  <input type="radio" name="pl-via" className={radio} value={v} checked={via === v} onChange={() => setVia(v)} />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Payment Gateway</label>
            <div className="mt-1 flex flex-wrap gap-2.5">
              {gw.payu && (
                <label className={`flex w-fit cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-4 py-3 transition ${gateway === "payu" ? "border-accent bg-accent-light" : "border-line"}`}>
                  <input type="radio" name="pl-gateway" className={radio} value="payu" checked={gateway === "payu"} onChange={() => setGateway("payu")} />
                  <span className="font-bold text-gray-800">PayU</span>
                  <span className="rounded-full bg-[#1E7E5E] px-2 py-0.5 text-[10px] font-bold text-white">Recommended</span>
                </label>
              )}
              {gw.paytm && (
                <label className={`flex w-fit cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-4 py-3 transition ${gateway === "paytm" ? "border-accent bg-accent-light" : "border-line"}`}>
                  <input type="radio" name="pl-gateway" className={radio} value="paytm" checked={gateway === "paytm"} onChange={() => setGateway("paytm")} />
                  <span className="font-bold text-gray-800">Paytm</span>
                </label>
              )}
              {!gw.payu && !gw.paytm && (
                <div className="w-full rounded-lg border border-[#f5c6c6] bg-[#fdf2f2] px-3 py-2 text-sm text-danger">
                  No payment gateways are currently active. Ask admin to enable them.
                </div>
              )}
            </div>
          </div>

          {gw.payu && gateway === "payu" && (
            <div>
              <label className="label">PayU Method</label>
              <div className="mt-1 flex flex-wrap gap-5">
                <label className={radioLabel}>
                  <input type="radio" name="pl-payu" className={radio} value="upi" checked={payuMethod === "upi"} onChange={() => setPayuMethod("upi")} />
                  UPI / Wallets
                </label>
                <label className={radioLabel}>
                  <input type="radio" name="pl-payu" className={radio} value="other" checked={payuMethod === "other"} onChange={() => setPayuMethod("other")} />
                  Cards / Net Banking
                </label>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Generated Link modal ── */}
      <Modal
        open={resultLink !== null}
        onClose={() => setResultLink(null)}
        title="Payment Link Generated"
        size="sm"
        footer={
          <button className="btn-secondary" onClick={() => setResultLink(null)}>
            Close
          </button>
        }
      >
        <p className="mb-2 text-sm text-gray-500">Your payment link:</p>
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
          <a
            href={resultLink || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex-1 break-all text-sm font-semibold text-accent-dark no-underline"
          >
            {resultLink}
          </a>
          <button className="rounded-lg bg-navy/60 px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy/80" onClick={copyLink}>
            Copy
          </button>
        </div>
      </Modal>
    </>
  );
}
