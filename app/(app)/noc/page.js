import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NocClient from "@/components/noc/NocClient";

export const metadata = { title: "NOC Generator" };
export const dynamic = "force-dynamic";

/**
 * /noc — port of noc.php (NOC Generator).
 * Role gate copied from header.php's menu check:
 *   array_intersect(['ADMIN','ACM','COLLECTION-HEAD'], $userRoles)
 * Users without one of these roles are sent back to the dashboard.
 */
export default function NocPage() {
  const session = getSession();
  if (!session) redirect("/login");

  const roles = session.roles || [];
  const allowed = ["ADMIN", "ACM", "COLLECTION-HEAD"].some((r) => roles.includes(r));
  if (!allowed) redirect("/dashboard");

  /* PHP: $userName = $_SESSION['employee_name'] ?? 'Officer' — prefills "Authorised By" */
  return <NocClient userName={session.name || "Officer"} />;
}
