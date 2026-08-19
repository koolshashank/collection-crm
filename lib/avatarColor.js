/**
 * lib/avatarColor.js — deterministic initials + color for a name/username,
 * so the same person always gets the same avatar across pages (Audit Log,
 * 2FA Admin, …) without needing a real profile picture.
 */

const AVATAR_TONES = ["#2563a8", "#0c7a70", "#7c3aed", "#b83280", "#c0392b", "#8a5a12"];

export function avatarColor(seed) {
  let hash = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** Same hex used for an avatar, as a translucent tint (e.g. for a matching badge/pill background). */
export function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
