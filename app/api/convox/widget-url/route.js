import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/convox/widget-url
 * Port of includes/convox_sso.php (convox_widget_url) — builds the ConVox
 * SSO widget URL for the logged-in agent. The encryption secret must NEVER
 * reach the browser, so the URL is computed server-side exactly like PHP:
 * AES-256-CBC, key = sha256(CONVOX_SSO_KEY) raw, fixed IV, raw output →
 * base64 → urlencode.
 *
 * Env (defaults = current PHP values):
 *  - CONVOX_DOMAIN      (default https://blinkrloan.deepijatel.in)
 *  - CONVOX_WIDGET_PATH (default /ConVoxCCS/ExternalIndex)
 *  - CONVOX_SSO_KEY     (default document example key — replace in prod)
 *  - CONVOX_SSO_IV      (default document example IV — replace in prod)
 */
const CONVOX_DOMAIN = process.env.CONVOX_DOMAIN || "https://blinkrloan.deepijatel.in";
const CONVOX_WIDGET_PATH = process.env.CONVOX_WIDGET_PATH || "/ConVoxCCS/ExternalIndex";
const CONVOX_SSO_KEY = process.env.CONVOX_SSO_KEY || "X9fT!2zQ@7rLw8pVb3Kd#6NhY0sGm5Ae";
const CONVOX_SSO_IV = process.env.CONVOX_SSO_IV || "MTIzNDU2Nzg5MDEyMzQ1Ng==";

function convoxEncryptUsername(username) {
  if (!username) return null;

  // Same IV handling as PHP: use as-is if 16 bytes, else try base64-decode.
  let iv = Buffer.from(CONVOX_SSO_IV, "utf8");
  if (iv.length !== 16) {
    try {
      const decoded = Buffer.from(CONVOX_SSO_IV, "base64");
      if (decoded.length === 16) iv = decoded;
      else return null;
    } catch {
      return null;
    }
  }

  try {
    const key = crypto.createHash("sha256").update(CONVOX_SSO_KEY).digest(); // 32-byte key
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const ciphertext = Buffer.concat([cipher.update(username, "utf8"), cipher.final()]);
    return encodeURIComponent(ciphertext.toString("base64"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const agentEmail = session.username || "";
    const enc = convoxEncryptUsername(agentEmail);
    if (!enc) {
      // Same outcome as PHP returning null — widget pane shows the
      // "agent email missing in session" message.
      return NextResponse.json({ success: true, url: null });
    }
    return NextResponse.json({
      success: true,
      url: `${CONVOX_DOMAIN}${CONVOX_WIDGET_PATH}?ExternalUserName=${enc}`,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Could not build widget URL." }, { status: 500 });
  }
}
