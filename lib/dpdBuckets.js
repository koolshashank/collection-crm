/**
 * Shared DPD bucket taxonomy for reporting. Copied verbatim from
 * components/dashboard/DpdBuckets.js's BUCKET_DEFS (same labels/colors/
 * order) rather than components/leads/leadUtils.js's dpdBucketInfo()
 * (a different, coarser 6-bucket taxonomy) — the dashboard's 7-bucket
 * version is the one users already associate with "DPD bucket" reporting.
 * Not refactoring DpdBuckets.js itself to import this — kept separate to
 * avoid touching an existing, working dashboard widget.
 */

export const DPD_BUCKETS = [
  { key: "no_dpd", label: "No DPD", color: "#1E7E5E", max: 0 },
  { key: "1_30", label: "1–30 DPD", color: "#e8a33d", max: 30 },
  { key: "31_60", label: "31–60 DPD", color: "#d97706", max: 60 },
  { key: "61_90", label: "61–90 DPD", color: "#ea580c", max: 90 },
  { key: "91_120", label: "91–120 DPD", color: "#dc2626", max: 120 },
  { key: "121_180", label: "121–180 DPD", color: "#b91c1c", max: 180 },
  { key: "180_plus", label: "180+ DPD", color: "#7f1d1d", max: Infinity },
];

export const UNKNOWN_BUCKET = { key: "unknown", label: "Unknown", color: "#9aa3b2" };

/** All bucket keys in display order, including "unknown" last. */
export const ALL_BUCKET_KEYS = [...DPD_BUCKETS.map((b) => b.key), UNKNOWN_BUCKET.key];

export function bucketLabel(key) {
  if (key === UNKNOWN_BUCKET.key) return UNKNOWN_BUCKET.label;
  return DPD_BUCKETS.find((b) => b.key === key)?.label ?? key;
}

export function bucketColor(key) {
  if (key === UNKNOWN_BUCKET.key) return UNKNOWN_BUCKET.color;
  return DPD_BUCKETS.find((b) => b.key === key)?.color ?? "#9aa3b2";
}

/** Maps a raw dpd number to a bucket key. Never drops a row — returns "unknown" for null/NaN. */
export function bucketKeyFor(dpdRaw) {
  if (dpdRaw === null || dpdRaw === undefined || dpdRaw === "") return UNKNOWN_BUCKET.key;
  const dpd = parseInt(dpdRaw, 10);
  if (Number.isNaN(dpd) || dpd < 0) return UNKNOWN_BUCKET.key;
  for (const b of DPD_BUCKETS) {
    if (dpd <= b.max) return b.key;
  }
  return "180_plus";
}
