"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientFetch } from "@/lib/clientFetch";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { CiIcon } from "@/components/client-info/icons";
import { fmtInr, numberFormat } from "./format";

const SAMPLE_LIMIT = 500;

/** Splits [min, max] into up to 3 roughly-equal sub-ranges — only when the
    bucket actually spans more than a couple of days (skipped for "No DPD"
    and the open-ended "180+" bucket). */
function stageRanges(min, max) {
  if (min == null || max == null || max - min < 2) return null;
  const span = max - min + 1;
  const step = Math.ceil(span / 3);
  const ranges = [];
  for (let start = min; start <= max; start += step) {
    ranges.push([start, Math.min(start + step - 1, max)]);
  }
  return ranges.length === 3 ? ranges : null;
}

/**
 * Detail view for one DPD bucket — fetches the real matching loans (via the
 * same dpd_min/dpd_max filters the Portfolio page itself supports) and
 * derives amount, stage split and a recent-cases list straight from those
 * records. Large buckets are sampled (SAMPLE_LIMIT) and clearly labeled as
 * such rather than silently presented as exact.
 */
export default function DpdBucketModal({ open, onClose, bucket }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!open || !bucket) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: String(SAMPLE_LIMIT), page: "1" });
      if (bucket.min != null) params.set("dpd_min", String(bucket.min));
      if (bucket.max != null) params.set("dpd_max", String(bucket.max));
      const res = await clientFetch(`/api/leads/list?${params.toString()}`);
      if (cancelled) return;
      if (!res.ok || !res.data?.success) {
        setError(res.data?.message || res.error || "Could not load cases for this bucket.");
        setLoading(false);
        return;
      }
      setLeads(Array.isArray(res.data.leads) ? res.data.leads : []);
      setTotalItems(parseInt(res.data.pagination?.totalItems ?? 0, 10) || 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bucket]);

  if (!bucket) return null;

  const sampled = totalItems > leads.length && leads.length > 0;
  const sampleAmount = leads.reduce((s, l) => s + (Number(l.repayment_amount) || 0), 0);
  const avgTicket = leads.length ? sampleAmount / leads.length : 0;
  const estimatedTotalAmount = sampled ? avgTicket * totalItems : sampleAmount;

  const ranges = stageRanges(bucket.min, bucket.max);
  const stages = ranges?.map(([lo, hi]) => {
    const count = leads.filter((l) => {
      const dpd = parseInt(l.dpd, 10);
      return Number.isFinite(dpd) && dpd >= lo && dpd <= hi;
    }).length;
    return { label: lo === hi ? `${lo} DPD` : `${lo}-${hi} DPD`, count, pct: leads.length ? Math.round((count / leads.length) * 1000) / 10 : 0 };
  });
  const maxStageCount = stages ? Math.max(1, ...stages.map((s) => s.count)) : 1;

  const recent = [...leads]
    .sort((a, b) => (Number(b.repayment_amount) || 0) - (Number(a.repayment_amount) || 0))
    .slice(0, 5);

  const filterQs = new URLSearchParams();
  if (bucket.min != null) filterQs.set("dpd_min", String(bucket.min));
  if (bucket.max != null) filterQs.set("dpd_max", String(bucket.max));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: bucket.color + "1a", color: bucket.color }}>
            <CiIcon name="warn" size={14} strokeWidth={2} />
          </span>
          DPD Bucket: {bucket.label}
        </span>
      }
      footer={
        <Link href={`/leads?${filterQs.toString()}`} className="text-sm font-semibold text-accent-dark hover:underline">
          View Case List →
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
          <Spinner size={20} /> Loading cases…
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-danger">{error}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-2xl font-bold text-gray-800">{numberFormat(bucket.count)}</div>
              <div className="mt-0.5 text-xs text-gray-400">{bucket.pctOfTotal !== null ? `${bucket.pctOfTotal}% of total portfolio` : "—"}</div>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${bucket.tierClass}`}>{bucket.tier}</span>
          </div>

          <div className="mt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Bucket Summary</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Amount {sampled && <span className="normal-case text-gray-400">(Est.)</span>}
                </div>
                <div className="mt-0.5 text-sm font-bold text-gray-800">{fmtInr(estimatedTotalAmount)}</div>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Cases</div>
                <div className="mt-0.5 text-sm font-bold text-gray-800">{numberFormat(bucket.count)}</div>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Avg. Ticket Size</div>
                <div className="mt-0.5 text-sm font-bold text-gray-800">{fmtInr(avgTicket)}</div>
              </div>
            </div>
            {sampled && (
              <p className="mt-1.5 text-[10.5px] text-gray-400">
                Amount and stage split are estimated from a sample of {leads.length.toLocaleString("en-IN")} of{" "}
                {totalItems.toLocaleString("en-IN")} cases.
              </p>
            )}
          </div>

          {stages && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Stage Analysis</h4>
              <div className="space-y-2">
                {stages.map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    <span className="w-20 shrink-0 text-xs text-gray-600">{s.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(4, (s.count / maxStageCount) * 100)}%`, background: bucket.color }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-gray-500">
                      {s.count} ({s.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              Recent Cases {sampled ? "(from sample)" : ""}
            </h4>
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400">No cases found in this bucket.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface text-left text-gray-500">
                      <th className="px-2.5 py-1.5 font-semibold">Loan No</th>
                      <th className="px-2.5 py-1.5 font-semibold">Name</th>
                      <th className="px-2.5 py-1.5 font-semibold">DPD</th>
                      <th className="px-2.5 py-1.5 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-2.5 py-1.5 font-semibold text-accent-dark">{l.loan_no || l.loan_id || "—"}</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{l.full_name || "—"}</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{l.dpd ?? "—"}</td>
                        <td className="px-2.5 py-1.5 font-semibold text-gray-800">{fmtInr(l.repayment_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
