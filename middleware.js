import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/verify-2fa",
  "/api/auth/setup-2fa",
  "/api/webhooks",
  "/api/tracking/ping",
  "/api/noc/track",
  "/api/convox/incoming-auth", // ConVox calls this without a session; route does its own secret auth
  "/api/convox/call-status",  // ConVox Call Status API webhook; route does its own secret auth
  "/api/config/company", // branding must be visible on the pre-login screen; route does its own admin gate for POST/DELETE
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const hasSession = Boolean(request.cookies.get("crm_session")?.value);

  // API routes: return 401 JSON instead of redirect
  if (pathname.startsWith("/api/")) {
    if (!isPublicApi && !hasSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isPublicPage && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)"],
};
