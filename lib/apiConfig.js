/**
 * Central API configuration — mirror of api_config.php.
 * Base URL of the core backend + named endpoint map.
 * Agents/API routes must use api_url() so every backend path lives here.
 *
 * ⚠️ There are FOUR distinct backend hosts this CRM talks to (found while
 * auditing for white-labeling — see refactor notes). Every one of them is
 * now env-var driven so copying this project for a different company is
 * just a matter of setting new values in .env.local — no code edits.
 */
export const API_BASE_URL =
  process.env.CRM_API_BASE_URL || "https://backend.blinkrloan.com/api/";

// "loansphere" service — admin dashboard summary, agent performance, top performers.
export const LOANSPHERE_API_BASE_URL =
  process.env.LOANSPHERE_API_BASE_URL || "https://api.blinkrloan.com/api/loansphere/";

// "paytracker" service — the portfolio/loan list used by Leads, Team Performance, etc.
export const PAYTRACKER_API_BASE_URL =
  process.env.PAYTRACKER_API_BASE_URL || "https://api.blinkrloan.com/api/paytracker/v1/";

/**
 * ⚠️ A SECOND paytracker host that three dashboard routes point at:
 * top-performers, portfolio-summary and portfolio-summary-list were all
 * hardcoded to `dev.api.blinkrloan.com` (the DEV server), not the
 * production host above. That was almost certainly left over from
 * development — flagged during the white-label refactor rather than
 * silently changed, since switching them to production could change what
 * those three dashboard widgets show. Point this at the production host
 * once the team confirms it's safe.
 */
export const PAYTRACKER_DEV_API_BASE_URL =
  process.env.PAYTRACKER_DEV_API_BASE_URL || "https://dev.api.blinkrloan.com/api/paytracker/v1/";

// Public-facing CRM domain — used for payment-gateway success/failure redirect
// URLs and any other link that needs to point back at this app from outside.
export const CRM_PUBLIC_BASE_URL =
  process.env.CRM_PUBLIC_BASE_URL || "https://crm.blinkrloan.com";

export const ENDPOINTS = {
  // PTP DETAILS (client info)
  get_emp_list: "collection/getEmpList",
  get_ptp_list: "collection/getPtpListAll",

  // CLIENT DETAILS
  get_loan_details: "collection/getLoanDetails/",
  get_address: "collection/getAddress/",
  get_mobile: "collection/getMobileNumber/",

  // LOGIN
  login: "collection/login",

  // DASHBOARD
  monthly_collection: "collection/month_wise_collection_data",

  // UNASSIGNED LEAD (assign lead)
  loan_list_unassigned: "collection/getLoanList1/unassignedactive",

  // CREATE USER (add employee)
  create_employee: "collection/create-employee",
};

/**
 * Build a full backend URL. Same behaviour as PHP api_url().
 * @param {string} key   endpoint key from ENDPOINTS (or a raw path if not found)
 * @param {string} suffix appended after the endpoint (ids etc.)
 * @param {object} params query string params
 */
export function apiUrl(key, suffix = "", params = {}) {
  const endpoint = ENDPOINTS[key] ?? key;
  let url = API_BASE_URL + endpoint + suffix;
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  if (qs) url += "?" + qs;
  return url;
}

/** Same idea as apiUrl(), but against the loansphere host. */
export function loansphereUrl(path, params = {}) {
  let url = LOANSPHERE_API_BASE_URL.replace(/\/+$/, "") + "/" + String(path).replace(/^\/+/, "");
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  if (qs) url += "?" + qs;
  return url;
}

/** Same idea as apiUrl(), but against the paytracker host. */
export function paytrackerUrl(path, params = {}) {
  let url = PAYTRACKER_API_BASE_URL.replace(/\/+$/, "") + "/" + String(path).replace(/^\/+/, "");
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  if (qs) url += "?" + qs;
  return url;
}

/** Against the DEV paytracker host — see the warning on PAYTRACKER_DEV_API_BASE_URL. */
export function paytrackerDevUrl(path, params = {}) {
  let url = PAYTRACKER_DEV_API_BASE_URL.replace(/\/+$/, "") + "/" + String(path).replace(/^\/+/, "");
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  if (qs) url += "?" + qs;
  return url;
}
