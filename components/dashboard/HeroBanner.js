"use client";

import Link from "next/link";
import { fmtInr, numberFormat, longToday } from "./format";

/**
 * Welcome hero — mirror of dashboard.php's .db-hero block.
 * Greeting + today's date + this-month collection (with MoM) fallback chain.
 */
export default function HeroBanner({ name, currVal, mom, portfolioTotal }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = (name || "User").trim().split(" ")[0];

  return (
    <div className="relative mb-5 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-navy-light to-navy px-6 py-5 sm:px-7">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(15,155,142,.2) 0%, transparent 60%)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-14 top-1/2 hidden -translate-y-1/2 font-display text-[8rem] leading-none text-accent/10 md:block"
      >
        ₹
      </span>

      <div className="relative">
        <div className="mb-1.5 font-display text-lg text-white">
          {greet}, {firstName} 👋
        </div>
        <div className="text-xs leading-relaxed text-white/60">
          Today is <strong className="text-accent">{longToday()}</strong>
          <br />
          {currVal > 0 ? (
            <>
              This month&apos;s collection: <strong className="text-accent">{fmtInr(currVal)}</strong>
              &nbsp;
              <span className={mom >= 0 ? "text-green-400" : "text-red-400"}>
                {mom >= 0 ? "▲ +" : "▼ "}
                {Math.abs(mom)}%
              </span>{" "}
              vs last month
            </>
          ) : portfolioTotal > 0 ? (
            <>
              Active portfolio: <strong className="text-accent">{numberFormat(portfolioTotal)} loan accounts</strong>
            </>
          ) : (
            <>Collection dashboard is ready. All data loads in real time.</>
          )}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.71rem] font-semibold text-white/80">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          &nbsp; Live
        </span>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.71rem] font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Portfolio
        </Link>
        <Link
          href="/assign-lead"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.71rem] font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          Assign
        </Link>
      </div>
    </div>
  );
}
