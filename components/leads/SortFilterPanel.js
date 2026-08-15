"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { clientFetch } from "@/lib/clientFetch";
import { buildQuery } from "./leadUtils";

const SORT_OPTIONS = [
  { value: "", label: "Recent First" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "repayment_amount_asc", label: "Repayment Amt ↑" },
  { value: "repayment_amount_desc", label: "Repayment Amt ↓" },
  { value: "sanction_amount_asc", label: "Sanction Amt ↑" },
  { value: "sanction_amount_desc", label: "Sanction Amt ↓" },
  { value: "repayment_date_asc", label: "Repayment Date ↑" },
  { value: "repayment_date_desc", label: "Repayment Date ↓" },
  { value: "disbursal_date_asc", label: "Disbursal Date ↑" },
  { value: "disbursal_date_desc", label: "Disbursal Date ↓" },
];

/* Same mapping as lpSfApply */
const DPD_BUCKET_MAP = {
  "0-dpd": "0-30 days", "1-30": "0-30 days", "31-60": "31-60 days",
  "61-90": "61-90 days", "91-180": "91-180 days", "180plus": "180+ days",
};

const EMPTY = {
  sortBy: "", callStatus: "", disposition: "", salFrom: "", salTo: "",
  status: "", minAmount: "", maxAmount: "", fromDate: "", toDate: "", partPay: "",
  allocBy: "", agentName: "", dpdMin: "", dpdMax: "", dpdBucket: "", city: "", state: "",
};

export default function SortFilterPanel({ open, onClose, currentParams, search, onApply }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [attrSearch, setAttrSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [savedFilters, setSavedFilters] = useState([]);
  const [savedSel, setSavedSel] = useState("");
  const [dispositions, setDispositions] = useState([]); // real {code,label,count} from the backend

  /* Real disposition codes — no hardcoded list, no per-lead cost (fetched
     once here, same summary endpoint the Disposition page's cards use). */
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await clientFetch("/api/disposition/history?mode=summary");
      if (alive && res.ok && res.data?.success) {
        setDispositions(Array.isArray(res.data.cards) ? res.data.cards : []);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* Prefill from URL params when opened (mirror of lpOpenSortFilter) */
  useEffect(() => {
    if (!open) return;
    const p = currentParams || {};
    setF({
      ...EMPTY,
      fromDate: p.repayment_date_from || "",
      toDate: p.repayment_date_to || "",
      salFrom: p.salary_date_from || "",
      salTo: p.salary_date_to || "",
      minAmount: p.repayment_amount_min || "",
      maxAmount: p.repayment_amount_max || "",
      dpdMin: p.dpd_min || "",
      dpdMax: p.dpd_max || "",
      city: p.city || "",
      state: p.state || "",
      agentName: p.agent_name || "",
      status: p.status || "",
      disposition: p.disposition_code || "",
      sortBy: p.sort ? `${p.sort}_${p.order || "asc"}` : "",
    });
    setAttrSearch("");
    try {
      setSavedFilters(JSON.parse(localStorage.getItem("lp_sf_filters") || "[]"));
    } catch {
      setSavedFilters([]);
    }
    setSavedSel("");
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open, currentParams]);

  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));

  const clearAll = () => setF(EMPTY);

  /* lpSfApply — builds a fresh query string with identical param names */
  const apply = () => {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (f.sortBy) {
      const parts = f.sortBy.split("_");
      const ord = parts.pop();
      params.sort = parts.join("_");
      params.order = ord;
    }
    if (f.city.trim()) params.city = f.city.trim();
    if (f.state.trim()) params.state = f.state.trim();
    if (f.agentName.trim()) params.agent_name = f.agentName.trim();
    if (f.salFrom) params.salary_date_from = f.salFrom;
    if (f.salTo) params.salary_date_to = f.salTo;
    if (f.minAmount) params.repayment_amount_min = f.minAmount;
    if (f.maxAmount) params.repayment_amount_max = f.maxAmount;
    if (f.fromDate) params.repayment_date_from = f.fromDate;
    if (f.toDate) params.repayment_date_to = f.toDate;
    if (f.dpdMin) params.dpd_min = f.dpdMin;
    if (f.dpdMax) params.dpd_max = f.dpdMax;
    if (f.dpdBucket && DPD_BUCKET_MAP[f.dpdBucket]) params.dpd_bucket = DPD_BUCKET_MAP[f.dpdBucket];
    if (f.status) params.status = f.status;
    if (f.disposition) params.disposition_code = f.disposition;
    params.page = "1";
    onApply(params);
  };

  /* lpSfSave — saved filters kept in localStorage under the same key */
  const saveFilter = () => {
    const name = prompt("Name this filter:");
    if (!name) return;
    const qs = "?" + buildQuery(currentParams);
    const saved = [...savedFilters, { name, params: qs }];
    localStorage.setItem("lp_sf_filters", JSON.stringify(saved));
    setSavedFilters(saved);
    setSavedSel(qs);
    toast.success('Filter saved as "' + name + '"');
  };

  const groups = useMemo(() => ([
    {
      id: "telecalling", title: "Telecalling Attributes",
      labels: ["Call Status", "Disposition", "Salary Date Range"],
    },
    {
      id: "loan", title: "Loan Attributes",
      labels: ["Payment Status", "Repayment Amount (₹)", "Repayment Date Range", "Part Payment"],
    },
    { id: "allocation", title: "Allocation Attributes", labels: ["Allocated By", "Agent Name"] },
    { id: "recovery", title: "Recovery Attributes", labels: ["DPD Range", "DPD Bucket"] },
    { id: "platform", title: "Platform Attributes", labels: ["City", "State"] },
  ]), []);

  const groupVisible = (g) => {
    const q = attrSearch.toLowerCase();
    if (!q) return true;
    return g.title.toLowerCase().includes(q) || g.labels.some((l) => l.toLowerCase().includes(q));
  };
  const isGroupOpen = (g) => Boolean(openGroups[g.id]) || (attrSearch && groupVisible(g));

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[750] bg-navy/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-[751] flex w-[440px] max-w-[100vw] flex-col bg-surface shadow-pop">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-5 py-4">
          <span className="font-display text-base font-bold text-gray-800">Sort &amp; Filter</span>
          <span className="flex items-center gap-3">
            <button className="text-xs font-bold uppercase tracking-wide text-danger hover:underline" onClick={clearAll}>
              CLEAR ALL
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Saved filter */}
          <div className="card mb-2.5 p-4">
            <p className="label mb-1.5">Saved Filter</p>
            <p className="mb-1 text-xs text-gray-400">Select</p>
            <select
              className="input w-full"
              value={savedSel}
              onChange={(e) => {
                setSavedSel(e.target.value);
                if (e.target.value) router.push("/leads" + e.target.value);
              }}
            >
              <option value="">— Select saved filter —</option>
              {savedFilters.map((sf, i) => (
                <option key={i} value={sf.params}>{sf.name}</option>
              ))}
            </select>
          </div>

          {/* Sort by */}
          <div className="card mb-2.5 flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Sort By</span>
            <select className="input !w-auto font-semibold" value={f.sortBy} onChange={(e) => set("sortBy")(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Filter by */}
          <div className="card mb-2.5 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Filter By</span>
            </div>
            <div className="border-b border-line px-3 py-2.5">
              <input
                type="text"
                className="input w-full"
                placeholder="Search"
                value={attrSearch}
                onChange={(e) => setAttrSearch(e.target.value)}
              />
            </div>

            {/* Telecalling Attributes */}
            <Group g={groups[0]} visible={groupVisible(groups[0])} open={isGroupOpen(groups[0])}
              toggle={() => setOpenGroups((o) => ({ ...o, telecalling: !o.telecalling }))}>
              <Field label="Call Status">
                <Pills
                  name="sf_call_status"
                  value={f.callStatus}
                  onChange={set("callStatus")}
                  options={[["", "All"], ["connected", "Connected"], ["not_connected", "Not Connected"], ["busy", "Busy"]]}
                />
              </Field>
              <Field label="Disposition">
                <select className="input w-full" value={f.disposition} onChange={(e) => set("disposition")(e.target.value)}>
                  <option value="">All</option>
                  {dispositions.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label || d.code} ({d.count})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Salary Date Range">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="input" value={f.salFrom} onChange={(e) => set("salFrom")(e.target.value)} />
                  <input type="date" className="input" value={f.salTo} onChange={(e) => set("salTo")(e.target.value)} />
                </div>
              </Field>
            </Group>

            {/* Loan Attributes */}
            <Group g={groups[1]} visible={groupVisible(groups[1])} open={isGroupOpen(groups[1])}
              toggle={() => setOpenGroups((o) => ({ ...o, loan: !o.loan }))}>
              <Field label="Payment Status">
                <Pills
                  name="sf_status"
                  value={f.status}
                  onChange={set("status")}
                  options={[["", "All"], ["not_recovered", "Not Recovered"], ["part_payment", "Part Payment"], ["recovered", "Recovered"], ["settled", "Settled"]]}
                />
              </Field>
              <Field label="Repayment Amount (₹)">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="input" placeholder="Min" value={f.minAmount} onChange={(e) => set("minAmount")(e.target.value)} />
                  <input type="number" className="input" placeholder="Max" value={f.maxAmount} onChange={(e) => set("maxAmount")(e.target.value)} />
                </div>
              </Field>
              <Field label="Repayment Date Range">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="input" value={f.fromDate} onChange={(e) => set("fromDate")(e.target.value)} />
                  <input type="date" className="input" value={f.toDate} onChange={(e) => set("toDate")(e.target.value)} />
                </div>
              </Field>
              <Field label="Part Payment">
                <Pills
                  name="sf_partpay"
                  value={f.partPay}
                  onChange={set("partPay")}
                  options={[["", "All"], ["1", "Yes"], ["0", "No"]]}
                />
              </Field>
            </Group>

            {/* Allocation Attributes */}
            <Group g={groups[2]} visible={groupVisible(groups[2])} open={isGroupOpen(groups[2])}
              toggle={() => setOpenGroups((o) => ({ ...o, allocation: !o.allocation }))}>
              <Field label="Allocated By">
                <input type="text" className="input w-full" placeholder="Manager / Agent name" value={f.allocBy} onChange={(e) => set("allocBy")(e.target.value)} />
              </Field>
              <Field label="Agent Name">
                <input type="text" className="input w-full" placeholder="Agent name" value={f.agentName} onChange={(e) => set("agentName")(e.target.value)} />
              </Field>
            </Group>

            {/* Recovery Attributes */}
            <Group g={groups[3]} visible={groupVisible(groups[3])} open={isGroupOpen(groups[3])}
              toggle={() => setOpenGroups((o) => ({ ...o, recovery: !o.recovery }))}>
              <Field label="DPD Range">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="input" placeholder="Min DPD" value={f.dpdMin} onChange={(e) => set("dpdMin")(e.target.value)} />
                  <input type="number" className="input" placeholder="Max DPD" value={f.dpdMax} onChange={(e) => set("dpdMax")(e.target.value)} />
                </div>
              </Field>
              <Field label="DPD Bucket">
                <Pills
                  name="sf_dpd_bucket"
                  value={f.dpdBucket}
                  onChange={set("dpdBucket")}
                  options={[["", "All"], ["0-dpd", "0 DPD"], ["1-30", "1-30"], ["31-60", "31-60"], ["61-90", "61-90"], ["91-180", "91-180"], ["180plus", "180+"]]}
                />
              </Field>
            </Group>

            {/* Platform Attributes */}
            <Group g={groups[4]} visible={groupVisible(groups[4])} open={isGroupOpen(groups[4])}
              toggle={() => setOpenGroups((o) => ({ ...o, platform: !o.platform }))}>
              <Field label="City">
                <input type="text" className="input w-full" placeholder="e.g. Mumbai" value={f.city} onChange={(e) => set("city")(e.target.value)} />
              </Field>
              <Field label="State">
                <input type="text" className="input w-full" placeholder="e.g. Maharashtra" value={f.state} onChange={(e) => set("state")(e.target.value)} />
              </Field>
            </Group>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2.5 border-t border-line bg-panel p-3.5">
          <button className="btn-secondary flex-1 !font-bold uppercase tracking-wide" onClick={saveFilter}>
            SAVE FILTER
          </button>
          <button className="btn-primary flex-[1.6] !font-bold uppercase tracking-wide" onClick={apply}>
            APPLY FILTER
          </button>
        </div>
      </div>
    </>
  );
}

function Group({ g, visible, open, toggle, children }) {
  if (!visible) return null;
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-surface"
        onClick={toggle}
      >
        <span className="text-sm font-medium text-gray-700">{g.title}</span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="px-4 pb-3.5 pt-1">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <span className="label mb-1 block">{label}</span>
      {children}
    </div>
  );
}

function Pills({ name, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <label
            key={`${name}-${val}`}
            className={`cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? "border-accent bg-accent-light font-bold text-accent-dark"
                : "border-line bg-panel text-gray-600 hover:border-accent/50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={val}
              checked={active}
              onChange={() => onChange(val)}
              className="hidden"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
