/**
 * lib/fieldVisitStore.js — local store for field visit assignments.
 *
 * ⚠️ TEMPORARY BACKING STORE. There is no field-visit endpoint on the real
 * backend yet, so visits are kept in data/field_visits.json (same pattern as
 * teamsStore.js / monthlyTargetStore.js). Two consequences worth knowing:
 *   - the file lives on the server's disk, so a redeploy that wipes the
 *     working directory loses the data;
 *   - with more than one server instance, each keeps its own copy.
 * Once the backend exposes list/create endpoints, swap the bodies of these
 * functions to call it — the API routes and UI won't need to change.
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "field_visits.json");

function readAll() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    return Array.isArray(parsed.visits) ? parsed.visits : [];
  } catch {
    return [];
  }
}

function writeAll(visits) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify({ visits }, null, 2));
}

/** Newest first, with optional filtering + pagination. */
export function listFieldVisits({ search = "", status = "", agent = "", from = "", to = "", page = 1, limit = 25 } = {}) {
  let rows = readAll().sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.lead_id, r.loan_id, r.customer_name, r.mobile, r.agent_name, r.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }
  if (status.trim()) rows = rows.filter((r) => String(r.status ?? "") === status.trim());
  if (agent.trim()) rows = rows.filter((r) => String(r.agent_name ?? "") === agent.trim());
  if (from) rows = rows.filter((r) => String(r.visit_date ?? "") >= from);
  if (to) rows = rows.filter((r) => String(r.visit_date ?? "") <= to);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * limit;

  return {
    rows: rows.slice(start, start + limit),
    pagination: { currentPage, limit, totalItems, totalPages },
  };
}

/** Counts by status across ALL visits (ignores filters) — for the top cards. */
export function fieldVisitSummary() {
  const rows = readAll();
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    completed: rows.filter((r) => r.status === "completed").length,
    today: rows.filter((r) => r.visit_date === today).length,
  };
}

export function createFieldVisit(data) {
  const visits = readAll();
  const visit = {
    id: `fv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lead_id: String(data.lead_id ?? "").trim(),
    loan_id: String(data.loan_id ?? "").trim(),
    customer_name: String(data.customer_name ?? "").trim(),
    mobile: String(data.mobile ?? "").trim(),
    address: String(data.address ?? "").trim(),
    agent_id: String(data.agent_id ?? "").trim(),
    agent_name: String(data.agent_name ?? "").trim(),
    visit_date: String(data.visit_date ?? "").trim(),
    priority: String(data.priority ?? "normal").trim(),
    notes: String(data.notes ?? "").trim(),
    status: "pending",
    assigned_by: String(data.assigned_by ?? "").trim(),
    created_at: Math.floor(Date.now() / 1000),
  };
  visits.push(visit);
  writeAll(visits);
  return visit;
}

/** Distinct agent names seen so far — populates the filter dropdown. */
export function fieldVisitAgents() {
  return [...new Set(readAll().map((r) => r.agent_name).filter(Boolean))].sort();
}
