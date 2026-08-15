import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/config/whatsapp — 1:1 port of whatsapp_config.php.
 * Reads or writes which 3rd-party WhatsApp vendor is active.
 * Config stored in: data/whatsapp_config.json (project root).
 *
 * GET  → { success: true, config }
 * POST { "active_vendor": "vendor_a" } → saves config, returns { success, config, message }
 *
 * Only ONE vendor can be active at a time (exclusive selection) — sending the
 * same customer template through two WhatsApp vendors at once would
 * double-send messages.
 *
 * POST is admin only: ADMIN, COLLECTION-HEAD or RECOVERY_HEAD (verbatim from PHP).
 */

const CONFIG_FILE = path.join(process.cwd(), "data", "whatsapp_config.json");

/* Default config if file doesn't exist yet (same as PHP) */
const DEFAULTS = {
  active_vendor: "vendor_a",
  vendors: {
    vendor_a: { label: "WhatsApp Vendor A", enabled: true },
    vendor_b: { label: "WhatsApp Vendor B", enabled: false },
  },
};

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === "object" ? decoded : structuredClone(DEFAULTS);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return (
    roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD")
  );
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

  const requestedVendor = body.active_vendor ?? "vendor_a";
  if (!["vendor_a", "vendor_b"].includes(requestedVendor)) {
    return NextResponse.json({ success: false, message: "Unknown vendor key" }, { status: 400 });
  }

  /* Keep existing labels/credentials, just flip which one is active + enabled */
  const existing = await loadConfig();

  const cfg = {
    active_vendor: requestedVendor,
    vendors: {
      vendor_a: {
        label: existing?.vendors?.vendor_a?.label ?? "WhatsApp Vendor A",
        enabled: requestedVendor === "vendor_a",
      },
      vendor_b: {
        label: existing?.vendors?.vendor_b?.label ?? "WhatsApp Vendor B",
        enabled: requestedVendor === "vendor_b",
      },
    },
  };

  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 4), "utf8");
    logActivity({
      session,
      action: "settings_changed",
      category: "settings",
      meta: { config: "whatsapp", active_vendor: cfg.active_vendor },
    });
    return NextResponse.json({ success: true, config: cfg, message: "WhatsApp vendor updated" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }
}
