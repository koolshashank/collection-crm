"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";
import { visibleSections } from "./menuConfig";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import ChangePasswordModal from "./ChangePasswordModal";
import { ToastProvider } from "@/components/ui/Toast";
import { postJson } from "@/lib/clientFetch";
import { useCompanyConfig } from "@/components/company/CompanyConfigProvider";

function useMenuConfig() {
  const [cfg, setCfg] = useState({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("crm_menu_config");
      if (raw) setCfg(JSON.parse(raw));
    } catch {
      /* corrupted config — ignore */
    }
  }, []);
  return cfg;
}

/* Login-session timer widget (port of the header.php timer + tracking ping) */
function TimerWidget() {
  const [elapsed, setElapsed] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [open, setOpen] = useState(false);
  const startRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const KEY = "crm_shift_start";
    const DAY_KEY = "crm_shift_day";
    const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

    /**
     * A tab left open overnight used to keep counting into the next day
     * (94:56:43 and climbing). The shift is a per-day thing, so when the
     * calendar day rolls over we end the session instead of carrying the
     * timer forward — the user logs in again and the counter starts at 0.
     */
    const endStaleSession = async () => {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(DAY_KEY);
      sessionStorage.removeItem("crm_on_break");
      try {
        await postJson("/api/auth/logout", {});
      } catch {
        /* logging out locally still matters even if the call fails */
      }
      window.location.href = "/login";
    };

    let start = Number(sessionStorage.getItem(KEY));
    const storedDay = sessionStorage.getItem(DAY_KEY);

    if (start && storedDay && storedDay !== todayStr()) {
      endStaleSession();
      return;
    }

    if (!start) {
      start = Date.now();
      sessionStorage.setItem(KEY, String(start));
    }
    sessionStorage.setItem(DAY_KEY, todayStr());

    startRef.current = start;

    const tick = setInterval(() => {
      // Catches the rollover while the tab sits open, not just on reload.
      if (sessionStorage.getItem(DAY_KEY) !== todayStr()) {
        endStaleSession();
        return;
      }
      setElapsed(Date.now() - start);
    }, 1000);

    // activity ping (mirror of tracking_ping.php loop)
    const ping = () =>
      postJson("/api/tracking/ping", { status: sessionStorage.getItem("crm_on_break") === "1" ? "break" : "active" }).catch(() => {});
    ping();
    const pinger = setInterval(ping, 60000);

    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => {
      clearInterval(tick);
      clearInterval(pinger);
      document.removeEventListener("click", onDoc);
    };
  }, []);

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const toggleBreak = () => {
    const next = !onBreak;
    setOnBreak(next);
    sessionStorage.setItem("crm_on_break", next ? "1" : "0");
    postJson("/api/tracking/ping", { status: next ? "break_start" : "break_end" }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 transition hover:bg-white/10"
      >
        <span
          className={`h-2 w-2 rounded-full ${onBreak ? "bg-amber" : "bg-emerald-400 animate-pulse"}`}
        />
        <span className="hidden text-xs text-white/60 sm:inline">{onBreak ? "On break" : "Logged in"}</span>
        <span className={`text-sm font-bold tabular-nums ${onBreak ? "text-amber" : "text-white"}`}>{fmt(elapsed)}</span>
        <Icon name="chevron" size={13} className="text-white/50" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[300] w-60 rounded-xl border border-line bg-white p-3 shadow-pop">
          <p className="text-sm font-bold text-gray-800">{onBreak ? "On a break" : "Active session"}</p>
          <p className="mt-0.5 text-xs text-gray-500">Elapsed today: {fmt(elapsed)}</p>
          <button onClick={toggleBreak} className={`${onBreak ? "btn-primary" : "btn-secondary"} mt-3 w-full`}>
            {onBreak ? "Resume work" : "Take a break"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ user, children, rolePermissions }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appName, tagline, logoUrl } = useCompanyConfig();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuConfig = useMenuConfig();
  const profileRef = useRef(null);

  const roles = user?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const roleLabel = roles.length
    ? roles[0].toLowerCase().replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Staff";
  const sections = visibleSections(roles, menuConfig, rolePermissions);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onDoc = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const logout = async () => {
    // Without this the next login in the same tab resumes the old timer.
    sessionStorage.removeItem("crm_shift_start");
    sessionStorage.removeItem("crm_shift_day");
    sessionStorage.removeItem("crm_on_break");
    await postJson("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ToastProvider>
      {/* ===== TOP HEADER ===== */}
      <header className="fixed inset-x-0 top-0 z-[200] flex h-16 items-center bg-navy pr-3 shadow-[0_2px_14px_rgba(27,42,74,.18)] sm:pr-5">
        <Link
          href="/dashboard"
          className={`flex h-full shrink-0 items-center gap-2.5 overflow-hidden border-r border-white/10 pl-4 transition-all ${
            collapsed ? "w-16 justify-center pl-0" : "w-60"
          } max-lg:w-auto max-lg:border-none max-lg:pl-3`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent shadow-[0_4px_12px_rgba(15,155,142,.35)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={appName} className="h-full w-full object-cover" />
            ) : (
              <Icon name="shield-check" size={18} className="text-white" strokeWidth={2} />
            )}
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none max-sm:hidden">
              <span className="font-display text-[15px] text-white">{appName}</span>
              <span className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[.08em] text-white/55">
                {tagline}
              </span>
            </span>
          )}
        </Link>

        {/* collapse (desktop) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-3 hidden h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white/60 transition hover:border-accent hover:text-white lg:flex"
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" size={15} />
        </button>
        {/* hamburger (mobile) */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/70 lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" size={17} />
        </button>

        <div className="flex flex-1 items-center gap-2 sm:gap-3">
          <GlobalSearch />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAdmin && <NotificationBell />}
            <TimerWidget />
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="max-w-[140px] truncate text-xs font-semibold text-white">{user?.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-white/50">{roleLabel}</span>
                </span>
                <Icon name="chevron" size={13} className="text-white/50" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[300] w-52 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-pop">
                  <Link href="/role-permissions" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Icon name="sliders" size={15} /> Role Permissions
                  </Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setChangePasswordOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Icon name="lock" size={15} /> Change Password
                  </button>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger hover:bg-red-50"
                  >
                    <Icon name="logout" size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== SIDEBAR ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[190] bg-navy/40 backdrop-blur-[1px] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed bottom-0 top-16 z-[195] flex flex-col overflow-y-auto bg-navy pb-6 pt-3 transition-all duration-300
          ${collapsed ? "lg:w-16" : "lg:w-60"}
          max-lg:w-64 max-lg:shadow-pop ${mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"} left-0`}
      >
        {sections.map((section) => (
          <div key={section.label} className="mb-1 px-3">
            {!collapsed && (
              <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.12em] text-white/35">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  title={item.label}
                  className={`group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition
                    ${active ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}
                    ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />}
                  <Icon name={item.icon} size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="mt-auto px-3 pt-3">
          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-danger/90 transition hover:bg-white/5 hover:text-danger ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
          >
            <Icon name="logout" size={17} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main
        className={`flex min-h-screen flex-col pt-16 transition-all duration-300 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}
      >
        <div className="flex-1 p-4 sm:p-6">{children}</div>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-white/10 bg-navy px-4 py-4 text-center text-xs text-white/50 sm:px-6">
          © {new Date().getFullYear()} <span className="font-semibold text-white/80">{appName}</span>
          {tagline ? ` — ${tagline}` : ""}. All rights reserved.
        </footer>
      </main>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </ToastProvider>
  );
}