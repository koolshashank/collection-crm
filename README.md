# Quantilix Collection CRM — Next.js

Complete rewrite of the PHP QuantilixCRM in **Next.js 14 (App Router, JavaScript) + Tailwind CSS**. Business logic, API endpoints, request/response contracts, role checks and all content are preserved 1:1 from the PHP source; the UI is fully redesigned (same brand: teal accent, navy shell, DM Sans/Playfair) and responsive from 360px up.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — all values default to the PHP source values
npm run dev                  # http://localhost:3000
# production:
npm run build && npm start
```

Login uses the same backend (`collection/login`) and the same allowed roles (COLLECTION-HEAD, ADMIN, COLLECTION-EXECUTIVE, VISITOR, ACCOUNTS, RECOVERY_HEAD, ACM). The JWT is stored in an **httpOnly cookie** (`crm_session`) instead of a PHP session — safer, nothing else changed.

## What maps to what

| PHP | Next.js |
|---|---|
| login.php | `/login` + `POST /api/auth/login` |
| dashboard.php | `/dashboard` + `/api/dashboard/*` proxies |
| lead.php (Portfolio) | `/leads` + `/api/leads/*` |
| client_info.php | `/client-info?lead_id=…` + `/api/client/*` |
| assign_lead.php, round_robin_assign.php | `/assign-lead` + `/api/assign/*` |
| collection.php, collection_export.php | `/collection` + `/api/collection/*` (export = same .xlsx) |
| ptp_details.php | `/ptp` + `/api/ptp/*` |
| settings.php, gateway_config.php, whatsapp_config.php | `/settings` + `/api/config/*` (persists to `data/*.json`) |
| noc.php, noc_fetch/generate/email.php | `/noc` + `/api/noc/*` (PDF via jsPDF, mail via nodemailer, upload via S3) |
| whatsapp_* / dootiq_* | `/api/whatsapp/*`, `/api/webhooks/dootiq`, chat & template modals |
| convox_* | `/api/convox/*` + floating call widget |
| generate_payment_link_paytm/payu.php | `/api/payment-link/paytm` / `payu` |
| tracking_ping.php, tracker_db.php (SQLite) | `/api/tracking/ping` (JSONL store in `data/tracker.jsonl`) |
| header.php / footer.php | AppShell (sidebar + header), menu-manager localStorage key `crm_menu_config` unchanged |
| get_*.php proxies | `/api/…` route handlers (same params, same response shapes) |

Menu items whose pages were **not in the source bundle** (payments, reports, settlement, mail UI, etc.) stay in the sidebar and land on a "Module not migrated yet" page — plug them in later without touching navigation.

## Endpoints that need `LEGACY_PHP_BASE_URL`

The old UI called a handful of PHP files that were **missing from the zip** (submit_ptp.php, process_assign.php, bulkAssignProcess.php, submit_remarks.php, submit_disposition.php, block_pan_action.php, enable_reloan.php, post-payment-api.php, get_lead_pan.php, loan_history_proxy.php, assign_field.php, loan_correction_proxy.php, most settlement_action.php actions). Their Next.js routes exist with identical contracts and will transparently proxy to your old PHP host if you set `LEGACY_PHP_BASE_URL`; otherwise they return a clear 501 JSON. Search the codebase for `TODO(legacy)` to port their real logic later.

## Improvements over the PHP version

- Robust error handling everywhere: every fetch has timeouts; pages show loading / error-with-retry / empty states; API routes validate input and never leak stack traces; expired sessions bounce to /login automatically.
- httpOnly-cookie JWT (was readable in HTML before), middleware-protected routes and 401 JSON for APIs.
- Excel export is built server-side (no CDN dependency), same file and columns.
- Third-party token caches (Dootiq, ConVox, Zoho) are in-memory + `/tmp` JSON — same shapes as the PHP `storage/` files.
- All secrets are env-overridable (`.env.example`), with the PHP values as defaults so it runs out of the box.
- Fully responsive: collapsible sidebar, mobile drawer nav, horizontally scrollable tables, wrapping filter bars.

## Notes

- `data/` holds runtime JSON stores (gateway/whatsapp config seeds copied from PHP, tracker, conversations). Keep it writable.
- `CONVENTIONS.md` documents the conversion rules used across the codebase.
- Dev/test PHP scripts (test_*.php) were intentionally not migrated.
