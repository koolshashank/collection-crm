import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readRolePermissions, writeRolePermissions } from "@/lib/rolePermissions";
import { ALL_ROLES, MENU_SECTIONS } from "@/components/nav/menuConfig";
import { logActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/**
 * /api/role-permissions — per-role sidebar menu visibility overrides.
 * GET  → { success: true, permissions }
 * POST { "<href>": { "<ROLE>": true|false } } → admin only
 */
function isAdminUser(session) {
  const roles = session?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
}

const VALID_HREFS = new Set(MENU_SECTIONS.flatMap((s) => s.items.map((i) => i.href)));
const VALID_ROLES = new Set(ALL_ROLES);

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, permissions: readRolePermissions() });
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

  if (typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Invalid permissions payload" }, { status: 400 });
  }

  const matrix = {};
  for (const [href, roleMap] of Object.entries(body)) {
    if (!VALID_HREFS.has(href) || typeof roleMap !== "object" || roleMap === null) continue;
    const cleanRoles = {};
    for (const [role, visible] of Object.entries(roleMap)) {
      if (VALID_ROLES.has(role)) cleanRoles[role] = Boolean(visible);
    }
    matrix[href] = cleanRoles;
  }

  const { ok, config } = writeRolePermissions(matrix);
  if (!ok) {
    return NextResponse.json(
      { success: false, message: "Could not write config file. Check folder permissions." },
      { status: 500 }
    );
  }

  logActivity({ session, action: "settings_changed", category: "settings", meta: { config: "role_permissions" } });
  return NextResponse.json({ success: true, permissions: config, message: "Role permissions saved" });
}
