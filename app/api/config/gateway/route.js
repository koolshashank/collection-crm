import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/gateway — 1:1 port of gateway_config.php.
 * Reads or writes payment gateway active/inactive state.
 * Config stored in: data/gateway_config.json (project root).
 *
 * GET  → { success: true, config: { payu, paytm } }
 * POST { "payu": true, "paytm": false } → saves config, returns { success, config, message }
 * POST is admin only: ADMIN or COLLECTION-HEAD (verbatim from PHP).
 */

const CONFIG_FILE = path.join(process.cwd(), "data", "gateway_config.json");

/* Default config if file doesn't exist yet (same as PHP) */
const DEFAULTS = { payu: true, paytm: true };

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === "object" ? decoded : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD");
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const cfg = await loadConfig();
  return NextResponse.json({ success: true, config: cfg });
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  }

  let body = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }

  const cfg = {
    payu: Boolean(body.payu ?? true),
    paytm: Boolean(body.paytm ?? true),
  };

  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 4), "utf8");
    logActivity({ session, action: "settings_changed", category: "settings", meta: { config: "gateway", ...cfg } });
    return NextResponse.json({ success: true, config: cfg, message: "Gateway settings saved" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }
}
