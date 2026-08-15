import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LeadsPageClient from "@/components/leads/LeadsPageClient";

export const metadata = { title: "Loan Portfolio — QuantilixCRM" };
export const dynamic = "force-dynamic";

/**
 * /leads — conversion of lead.php (Loan Portfolio).
 * Session values that lead.php read from $_SESSION are resolved here and
 * passed to the client component (roles, username for the ConVox widget,
 * jwt token for the "Copy Token" button — the PHP page embedded it in a
 * hidden span the same way).
 */
export default function LeadsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect("/login");

  return (
    <LeadsPageClient
      roles={session.roles || []}
      username={session.username || ""}
      jwtToken={session.jwt_token || ""}
      searchParams={searchParams || {}}
    />
  );
}
