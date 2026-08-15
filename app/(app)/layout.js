import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { readRolePermissions } from "@/lib/rolePermissions";
import AppShell from "@/components/nav/AppShell";
import GlobalWidgets from "@/components/integrations/GlobalWidgets";

export default function AppLayout({ children }) {
  const session = getSession();
  // A stale-but-present cookie (e.g. invalidated by a force-logout epoch
  // bump) can't be cleared from a Server Component render — redirecting
  // straight to /login would leave the cookie in place, and middleware.js
  // (which only checks cookie *presence*, not validity) would immediately
  // bounce /login back to /dashboard, looping forever. Routing through the
  // logout route handler clears the cookie first, breaking the loop.
  if (!session) redirect("/api/auth/logout");

  const user = {
    name: session.name,
    username: session.username,
    roles: session.roles || [],
    user_id: session.user_id,
  };

  const rolePermissions = readRolePermissions();

  return (
    <AppShell user={user} rolePermissions={rolePermissions}>
      {children}
      <GlobalWidgets />
    </AppShell>
  );
}
