/**
 * Shared color + icon mapping for disposition codes — used by both
 * DispositionCards and DispositionTable so the same code always reads as
 * the same color everywhere on the page. Colors are light tints pulled
 * from the app's own palette (accent teal, blue, amber, purple, pink,
 * danger), not a new scheme.
 */
const TONES = [
  { bg: "#eef6fd", border: "#bcd8f5", text: "#2563a8", dot: "#2563a8" },
  { bg: "#e6f6f4", border: "#a8e0d8", text: "#0c7a70", dot: "#0f9b8e" },
  { bg: "#fdf6e9", border: "#f0d9a8", text: "#8a5a12", dot: "#e8a33d" },
  { bg: "#f6f1fd", border: "#ddd0f7", text: "#6d28d9", dot: "#7c3aed" },
  { bg: "#fdf1f5", border: "#f6c9d6", text: "#b83280", dot: "#db4d8f" },
  { bg: "#fdf2f2", border: "#f3c6c6", text: "#c0392b", dot: "#c0392b" },
];

/** Deterministic tone for a code — same code, same colors, every render. */
export function toneForCode(code) {
  const s = String(code || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

const ICON_RULES = [
  [/promise/i, "cal"],
  [/refuse/i, "block"],
  [/disconnect/i, "phoneOff"],
  [/not connected|no response|ringing/i, "phone"],
  [/call ?back/i, "phone"],
  [/message/i, "mail"],
  [/paid/i, "check"],
  [/settlement/i, "waiver"],
];

/** Best-effort icon for a disposition label, falling back to a generic doc. */
export function iconForLabel(label) {
  const s = String(label || "");
  for (const [re, icon] of ICON_RULES) {
    if (re.test(s)) return icon;
  }
  return "doc";
}

const DESCRIPTIONS = {
  PTP: "Customers who have promised to pay on a certain date.",
  FPTP: "Promise-to-pay commitments scheduled for a future date.",
  BRPTP: "Promises to pay that were made and later broken.",
  RNR: "Calls that rang through but got no response from the customer.",
  NC: "Attempts where the call could not connect at all.",
  CB: "Customers who asked to be called back at another time.",
  CD: "Calls that disconnected mid-conversation.",
  RTP: "Customers who explicitly refused to pay.",
  LM: "Calls where a message was left for the customer.",
  PAID: "Cases marked paid at the time of the call.",
  STL: "Customers asking about a settlement instead of full payment.",
};

/** One-line explainer for a code, with a generic fallback for unknown codes. */
export function descriptionForCode(code, label) {
  return DESCRIPTIONS[String(code || "").toUpperCase()] || `All records logged with the "${label || code}" disposition.`;
}
