/**
 * lib/cibil/steps.js — the CIBIL reporting pipeline, defined once and used
 * by both the UI (app/(app)/cibil-report) and the API route
 * (app/api/cibil/[step]).
 *
 * ⚠️ NO BACKEND ENDPOINTS EXIST YET. Every step's `endpoint` is null, so the
 * API route answers with a clear "not connected" message and the UI shows
 * that on the step card. Nothing else needs to change when the real APIs
 * arrive — fill in `endpoint` (and `method`, if it isn't GET) here and the
 * whole page starts working.
 */

export const CIBIL_STEPS = [
  {
    key: "fetch-closable",
    step: 1,
    title: "Fetch loans to close",
    description: "Pull the accounts that qualify for closure in the selected date range.",
    action: "Fetch Data",
    kind: "fetch", // returns rows -> preview + CSV
    endpoint: null, // e.g. "cibil/closable-loans"
    method: "GET",
  },
  {
    key: "close-loans",
    step: 2,
    title: "Close the loans",
    description: "Mark the accounts from step 1 as closed.",
    action: "Close Loans",
    kind: "mutate", // changes data -> confirm before running
    confirm: "This will close the loan accounts fetched in step 1. Continue?",
    dependsOn: "fetch-closable",
    endpoint: null,
    method: "POST",
  },
  {
    key: "run-procedure",
    step: 3,
    title: "Run stored procedure",
    description: "Execute the CIBIL stored procedure so the reporting tables are refreshed.",
    action: "Run Procedure",
    kind: "mutate",
    confirm: "This will run the CIBIL stored procedure on the database. Continue?",
    dependsOn: "close-loans",
    endpoint: null,
    method: "POST",
  },
  {
    key: "not-disbursed",
    step: 4,
    title: "Not disbursed cases",
    description: "Fetch not-disbursed case details and export them to CSV.",
    action: "Fetch Data",
    kind: "fetch",
    exportName: "cibil_not_disbursed",
    endpoint: null,
    method: "GET",
  },
  {
    key: "disbursed",
    step: 5,
    title: "Disbursed cases",
    description: "Fetch disbursed case details and export them to CSV.",
    action: "Fetch Data",
    kind: "fetch",
    exportName: "cibil_disbursed",
    endpoint: null,
    method: "GET",
  },
  {
    key: "settlement",
    step: 6,
    title: "Settlement cases",
    description: "Fetch settlement case details and export them to CSV.",
    action: "Fetch Data",
    kind: "fetch",
    exportName: "cibil_settlement",
    endpoint: null,
    method: "GET",
  },
];

export function getStep(key) {
  return CIBIL_STEPS.find((s) => s.key === key) || null;
}
