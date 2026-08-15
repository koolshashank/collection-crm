/**
 * lib/twoFactor.js — TOTP (Google Authenticator) helpers.
 * Thin wrapper around otplib/qrcode so those two deps are only imported here.
 */

import { generateSecret as genSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Collection CRM";

/** Generates a new base32 TOTP secret. */
export function generateSecret() {
  return genSecret();
}

/** Builds the otpauth:// URI Google Authenticator scans/imports. */
export function keyUri(secret, accountLabel) {
  return generateURI({ issuer: ISSUER, label: accountLabel || "user", secret });
}

/** Renders the otpauth URI as a QR code data URL (PNG). */
export function toQrDataUrl(uri) {
  return QRCode.toDataURL(uri);
}

/** Verifies a 6-digit code against the stored secret (allows normal clock drift). */
export async function verifyCode(secret, code) {
  const token = String(code ?? "").trim();
  if (!secret || !/^\d{6}$/.test(token)) return false;
  try {
    const result = await verify({ secret, token });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}
