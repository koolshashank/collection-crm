"use client";

import { useEffect, useRef, useState } from "react";
import {
  statusMeta,
  fmtInr,
  fmtYmd,
  fmtDMonY,
  dpdBucketInfo,
  DPD_BUCKET_TONES,
} from "./leadUtils";

/* Sticky column offsets — same widths as lead.php (44 / 60 / 130 / 130 / 220) */
const STICKY = [
  { left: 0, width: 44 },
  { left: 44, width: 60 },
  { left: 104, width: 130 },
  { left: 234, width: 130 },
  { left: 364, width: 220 },
];

function SortHeader({ col, label, sort, order, onSort, className = "" }) {
  const arrow = sort === col ? (order === "asc" ? "▲" : "▼") : "⇅";
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-accent ${
        sort === col ? "font-bold text-accent-dark" : ""
      } ${className}`}
    >
      {label}
      <span className="text-[9px] opacity-70">{arrow}</span>
    </button>
  );
}

export default function LeadsTable({
  rows,
  priorityEnabled,
  currentPage,
  limit,
  sort,
  order,
  onSort,
  totalSanction,
  totalRepayment,
  actions,
}) {
  const scrollRef = useRef(null);
  const [menu, setMenu] = useState(null); // { idx, top, left }

  /* Close dropdown on outside click / scroll / resize / Escape (same as PHP) */
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-lp-dropdown]") && !e.target.closest?.("[data-lp-dots]")) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    const sc = scrollRef.current;
    sc?.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      sc?.removeEventListener("scroll", close);
    };
  }, [menu]);

  const toggleMenu = (e, idx) => {
    e.stopPropagation();
    if (menu?.idx === idx) { setMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const ddW = 200, ddH = 100; // 2-item menu now — was 330 when the menu had 8 items
    let left = rect.left;
    if (left + ddW > window.innerWidth - 8) left = rect.right - ddW;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + ddH > window.innerHeight - 8) top = Math.max(8, rect.top - ddH - 6);
    setMenu({ idx, top, left });
  };

  const stickyTh = (i) => ({
    position: "sticky",
    left: STICKY[i].left,
    minWidth: STICKY[i].width,
    width: STICKY[i].width,
    zIndex: 5,
  });
  const stickyTd = (i) => ({
    position: "sticky",
    left: STICKY[i].left,
    minWidth: STICKY[i].width,
    width: STICKY[i].width,
    zIndex: 3,
  });
  const col5Shadow = { boxShadow: "4px 0 8px -2px rgba(27,42,74,.10)", borderRight: "1.5px solid #e2e5ea" };

  const menuRow = menu ? rows[menu.idx] : null;

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="th bg-surface" style={stickyTh(0)}>#</th>
            <th className="th bg-surface text-center" style={stickyTh(1)}>Action</th>
            <th className="th bg-surface" style={stickyTh(2)}>
              <SortHeader col="status" label="Status" sort={sort} order={order} onSort={onSort} />
            </th>
            <th className="th bg-surface" style={stickyTh(3)}>
              <SortHeader col="loan_id" label="Loan ID" sort={sort} order={order} onSort={onSort} />
            </th>
            <th className="th bg-surface" style={{ ...stickyTh(4), ...col5Shadow }}>
              <SortHeader col="name" label="Borrower" sort={sort} order={order} onSort={onSort} />
            </th>
            <th className="th"><SortHeader col="repayment_amount" label="Repayment Amt" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th hidden md:table-cell"><SortHeader col="repayment_date" label="Repayment Date" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th hidden md:table-cell"><SortHeader col="mobile" label="Mobile" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th hidden md:table-cell"><SortHeader col="sanction_amount" label="Sanction Amt" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th"><SortHeader col="disbursal_date" label="Disbursal Date" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th"><SortHeader col="city" label="City" sort={sort} order={order} onSort={onSort} /></th>
            <th className="th"><SortHeader col="state" label="State" sort={sort} order={order} onSort={onSort} /></th>
            {priorityEnabled && (
              <th className="th whitespace-nowrap"><SortHeader col="priority_score" label="Priority" sort={sort} order={order} onSort={onSort} /></th>
            )}
            <th className="th whitespace-nowrap">DPD</th>
            <th className="th whitespace-nowrap">DPD Bucket</th>
            <th className="th whitespace-nowrap">Agent Name</th>
            <th className="th whitespace-nowrap">Salary Date</th>
            <th className="th whitespace-nowrap">Allocated By</th>
            <th className="th whitespace-nowrap">Disposition</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const meta = statusMeta(row.payment_status ?? "");
            const serial = (currentPage - 1) * limit + i + 1;
            const initials = String(row.full_name || "U").substring(0, 1).toUpperCase();
            const isReloan = Boolean(
              row.is_reloan_case && row.is_reloan_case !== false &&
              row.is_reloan_case !== "false" && row.is_reloan_case !== "0"
            );
            const { dpdInt, bucket, tone } = dpdBucketInfo(row);
            const agentName =
              row.collection_assigned_to_agent_name ?? row.agent_name ?? row.emp_name ?? null;
            const salaryDate = row.salary_date_ist ?? row.salary_date ?? null;
            const allocBy =
              row.collection_assigned_by_agent_name ?? row.allocated_by ?? row.assigned_by ?? null;

            return (
              <tr
                key={`${row.loan_id || ""}-${i}`}
                className={`group border-b border-line transition last:border-0 hover:bg-accent-light/25 ${
                  i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white"
                }`}
              >
                {/* # */}
                <td className="td bg-inherit text-xs text-gray-400 group-hover:bg-[#f4faf9]" style={stickyTd(0)}>
                  {serial}
                </td>

                {/* Action */}
                <td className="td bg-inherit !px-0 text-center group-hover:bg-[#f4faf9]" style={stickyTd(1)}>
                  <button
                    data-lp-dots
                    title="Actions"
                    onClick={(e) => toggleMenu(e, i)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border transition hover:border-accent hover:bg-accent-light hover:text-accent-dark ${
                      menu?.idx === i ? "border-accent bg-accent-light text-accent-dark" : "border-line bg-panel text-gray-400"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </td>

                {/* Status */}
                <td className="td bg-inherit group-hover:bg-[#f4faf9]" style={stickyTd(2)}>
                  <span className={`badge border ${meta.cls}`}>
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                    {meta.label}
                  </span>
                </td>

                {/* Loan ID — opens the One Pager page (sidebar/header stay, keeps app chrome) */}
                <td className="td bg-inherit group-hover:bg-[#f4faf9]" style={stickyTd(3)}>
                  <a
                    href={`/customer-one-pager?lead_id=${encodeURIComponent(row.lead_id ?? "")}`}
                    title="View customer one-pager"
                    className="badge cursor-pointer bg-accent-light font-bold text-accent-dark no-underline transition hover:scale-105 hover:bg-accent hover:text-white"
                  >
                    {row.loan_id ?? ""}
                  </a>
                </td>

                {/* Borrower (last frozen col) */}
                <td className="td bg-inherit group-hover:bg-[#f4faf9]" style={{ ...stickyTd(4), ...col5Shadow }}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-light to-accent font-display text-xs font-bold text-white">
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold leading-tight text-gray-800">{row.full_name ?? ""}</span>
                      <span className="block text-[11px] text-gray-400">{row.mobile ?? ""}</span>
                      <button
                        type="button"
                        title="View loan history"
                        onClick={(e) => { e.stopPropagation(); actions.onLoanHistory(row, isReloan); }}
                        className={`mt-0.5 inline-flex items-center gap-0.5 rounded border px-1.5 text-[9px] font-bold uppercase tracking-wide transition hover:scale-105 hover:opacity-80 ${
                          isReloan ? "border-info/40 bg-blue-50 text-info" : "border-accent/40 bg-accent-light text-accent-dark"
                        }`}
                      >
                        {isReloan ? "Reloan" : "Fresh"} ›
                      </button>
                    </span>
                    <button
                      title={`Call ${row.full_name ?? ""}`}
                      onClick={(e) => { e.stopPropagation(); actions.onCall(row); }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent-light text-accent-dark transition hover:scale-110 hover:bg-accent-dark hover:text-white"
                    >
                      <PhoneIcon />
                    </button>
                    <button
                      title={`WhatsApp ${row.full_name ?? ""}`}
                      onClick={(e) => { e.stopPropagation(); actions.onWhatsAppChat(row); }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#25D366] bg-[#e9fbf0] text-[#1E7E5E] transition hover:scale-110 hover:bg-[#25D366] hover:text-white"
                    >
                      <WhatsAppIcon />
                    </button>
                  </div>
                </td>

                {/* Scrollable columns */}
                <td className="td font-semibold tabular-nums text-accent-dark">{fmtInr(row.repayment_amount ?? 0)}</td>
                <td className="td hidden text-gray-400 md:table-cell">{row.repayment_date_ist ? fmtYmd(row.repayment_date_ist) : ""}</td>
                <td className="td hidden text-gray-600 md:table-cell">{row.mobile ?? ""}</td>
                <td className="td hidden font-semibold tabular-nums text-gray-800 md:table-cell">{fmtInr(row.sanction_amount ?? 0)}</td>
                <td className="td text-gray-400">{row.disbursal_date_ist ? fmtYmd(row.disbursal_date_ist) : ""}</td>
                <td className="td">{row.city ?? ""}</td>
                <td className="td">{row.state ?? ""}</td>

                {/* Priority (Smart Prioritization) */}
                {priorityEnabled && (
                  <td className="td whitespace-nowrap">
                    {row.__priorityInfo ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold"
                        style={{ color: row.__priorityInfo.color, borderColor: row.__priorityInfo.color + "40", background: row.__priorityInfo.color + "14" }}
                        title={`Priority score: ${row.__priorityInfo.score}`}
                      >
                        {row.__priorityInfo.band}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                )}

                {/* DPD */}
                <td className="td whitespace-nowrap">
                  {dpdInt !== null ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        dpdInt === 0 ? "text-accent-dark" : dpdInt <= 30 ? "text-amber" : "text-danger"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {dpdInt}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* DPD Bucket */}
                <td className="td whitespace-nowrap">
                  {bucket ? (
                    <span className={`badge border ${DPD_BUCKET_TONES[tone]}`}>{bucket}</span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* Agent Name */}
                <td className="td whitespace-nowrap text-xs text-gray-800">
                  {agentName ? (
                    <span className="flex items-center gap-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-light text-[10px] font-bold text-accent-dark">
                        {String(agentName).trim().substring(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium">{agentName}</span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Salary Date */}
                <td className="td whitespace-nowrap text-xs text-gray-400">
                  {salaryDate ? fmtDMonY(salaryDate) : <span className="text-gray-300">—</span>}
                </td>

                {/* Allocated By */}
                <td className="td whitespace-nowrap text-xs text-gray-600">
                  {allocBy || <span className="text-gray-300">—</span>}
                </td>

                {/* Latest Disposition (from the recent-history batch fetched once for the page) */}
                <td className="td whitespace-nowrap">
                  {row.__latestDisposition ? (
                    <span className="inline-flex flex-col">
                      <span className="badge w-fit border border-accent/40 bg-accent-light text-accent-dark">
                        {row.__latestDisposition.label}
                      </span>
                      <span className="mt-0.5 text-[10px] text-gray-400">{fmtDMonY(row.__latestDisposition.date)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-accent-light text-xs font-bold text-accent-dark">
            <td className="td !border-t border-line" colSpan={5}>
              Page Totals ({rows.length} records shown)
            </td>
            <td className="td">{fmtInr(totalRepayment)}</td>
            <td className="td hidden md:table-cell" />
            <td className="td hidden md:table-cell" />
            <td className="td hidden md:table-cell">{fmtInr(totalSanction)}</td>
            <td className="td" colSpan={priorityEnabled ? 10 : 9} />
          </tr>
        </tfoot>
      </table>

      {/* Row action dropdown (fixed-positioned, like lpToggleMenu) */}
      {menu && menuRow && (
        <div
          data-lp-dropdown
          className="fixed z-[999] min-w-[190px] origin-top-left overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-pop animate-[ltMenuIn_.14s_ease-out]"
          style={{ top: menu.top, left: menu.left }}
        >
          {/* Trimmed down to 2 options for now — rest kept in code above (onWhatsApp,
              onWhatsAppTemplate, onRemarks, onPtp, onAssign) for whenever they're needed again. */}
          <MenuBtn className="!text-accent-dark" onClick={() => { setMenu(null); actions.onCall(menuRow); }}>
            Call Disposition
          </MenuBtn>
          <MenuBtn onClick={() => { setMenu(null); actions.onTimeline(menuRow); }}>Disposition History</MenuBtn>
        </div>
      )}

      <style jsx>{`
        @keyframes ltMenuIn {
          from { opacity: 0; transform: scale(.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function MenuBtn({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-accent-light hover:text-accent-dark ${className}`}
    >
      {children}
    </button>
  );
}
function MenuLink({ children, href }) {
  return (
    <a
      href={href}
      className="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium text-gray-700 no-underline transition hover:bg-accent-light hover:text-accent-dark"
    >
      {children}
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.08 4.18 2 2 0 016 2h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L10.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.9.58 2.9.71A2 2 0 0122 16.92z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 003.85 1h.01a7.94 7.94 0 007.9-7.94 7.85 7.85 0 00-2.36-5.62zm-5.55 12.2h-.01a6.6 6.6 0 01-3.36-.92l-.24-.14-2.5.65.67-2.43-.16-.25a6.6 6.6 0 01-1.01-3.5 6.63 6.63 0 016.62-6.62 6.6 6.6 0 014.68 1.94 6.55 6.55 0 011.94 4.66 6.63 6.63 0 01-6.63 6.6z" />
    </svg>
  );
}
