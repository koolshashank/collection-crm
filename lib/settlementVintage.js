/**
 * Vintage-based settlement % — pure helpers, safe to import from client
 * components too (no `fs`). Reuses the same DPD bucket taxonomy as the
 * vintage-analysis reporting feature (lib/dpdBuckets.js) so "vintage" means
 * the same thing everywhere in the app, instead of inventing a second
 * day-range taxonomy just for settlements.
 */

import { DPD_BUCKETS, UNKNOWN_BUCKET, bucketKeyFor, bucketLabel } from "@/lib/dpdBuckets";

export const SETTLEMENT_VINTAGE_BUCKET_KEYS = DPD_BUCKETS.map((b) => b.key);

export const DEFAULT_SETTLEMENT_VINTAGE_PERCENTS = {
  no_dpd: 100,
  "1_30": 90,
  "31_60": 80,
  "61_90": 70,
  "91_120": 60,
  "121_180": 50,
  "180_plus": 40,
};

export const SETTLEMENT_VINTAGE_DEFAULTS = {
  enabled: true,
  percents: { ...DEFAULT_SETTLEMENT_VINTAGE_PERCENTS },
  updatedAt: null,
};

/**
 * Suggested settlement %/amount for a case's DPD, per the configured policy.
 * Informational only — callers must never feed this into the actual
 * settlement amount/waiver that gets submitted or approved.
 * Returns null when the policy is off, or the DPD can't be bucketed.
 */
export function getSettlementSuggestion(policy, dpd, baseAmount) {
  if (!policy?.enabled) return null;
  const bucketKey = bucketKeyFor(dpd);
  if (bucketKey === UNKNOWN_BUCKET.key) return null;
  const percent = Number(policy?.percents?.[bucketKey]);
  if (!Number.isFinite(percent)) return null;
  const base = Number(baseAmount) || 0;
  return {
    bucketKey,
    bucketLabel: bucketLabel(bucketKey),
    percent,
    amount: Math.round((base * percent) / 100),
  };
}
