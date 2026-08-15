# QuantilixCRM → Next.js — Conversion Conventions

**Read this fully before converting any PHP file.** Source PHP lives at
`QuantilixCRM_src/QuantilixCRM/` (sibling of this project, inside outputs).

## Golden rules
1. **Logic must NOT change.** Same endpoints, same request/response shapes, same field names,
   same role checks, same business rules, same validation. Only the UI look/markup is redesigned.
2. **Content must stay the same.** All labels, columns, statuses, filter options, texts stay identical.
3. **Robust error handling everywhere.** Never let a fetch throw unhandled. Use the shared helpers.
   Every page shows loading / error (with retry) / empty states.
4. **Fully responsive.** Tables get `overflow-x-auto` wrappers; filters wrap; test mentally at 360px, 768px, 1280px.
5. **JavaScript only** (no TypeScript). App Router. Files use `.js` extension (JSX allowed inside).

## Stack & paths
- Next.js 14 App Router, Tailwind CSS. Path alias `@/` = project root.
- Pages live in `app/(app)/<route>/page.js` → automatically wrapped by AppShell (navy sidebar + header) and protected by middleware.
- API route handlers live in `app/api/**/route.js`.
- Shared libs: `@/lib/apiConfig` (apiUrl, ENDPOINTS — **add new endpoint keys here**, keep PHP key names),
  `@/lib/serverApi` (apiGet/apiPost/rawGet/rawPost — server-side, auto Bearer token from session),
  `@/lib/session` (getSession() → { username, jwt_token, user_id, roles, name }),
  `@/lib/clientFetch` ("use client" — clientFetch/postJson, never throws, returns {ok,status,data,error}).
- Shared UI: `@/components/ui/Modal`, `@/components/ui/Spinner` (+PageLoader), `@/components/ui/Toast` (useToast),
  `@/components/ui/Feedback` (EmptyState, ErrorState, PageHeader, StatCard), `@/components/nav/Icon`.

## Design system (match exactly)
- Colors (tailwind tokens): `accent` #0f9b8e, `accent-dark`, `accent-light`, `navy` #1b2a4a, `surface`, `panel`,
  `line` (borders), `amber`, `danger`, `info`. Fonts: `font-sans` (DM Sans, default), `font-display` (Playfair, headings).
- CSS component classes available: `.card .btn-primary .btn-secondary .btn-danger .input .label .th .td .badge`.
- Page skeleton:
  ```jsx
  <PageHeader title="…" subtitle="…" actions={<button className="btn-primary">…</button>} />
  <div className="card p-4">…filters…</div>
  <div className="card mt-4 overflow-x-auto"><table className="w-full">…</table></div>
  ```
- Currency: Indian format `new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`.
- Status badges: use `.badge` + tone bg (e.g. `bg-accent-light text-accent-dark`, `bg-red-50 text-danger`, `bg-amber/10 text-amber`).

## Conversion pattern
- PHP page (server-rendered HTML + inline JS fetch) → client component page (`"use client"`) that
  fetches from our own `/api/...` routes with `clientFetch`.
- PHP proxy endpoint (get_*.php etc.) → `app/api/...` route handler using `apiGet/apiPost` (token comes from session cookie automatically).
- PHP `$_SESSION` checks → `getSession()` in route handlers; role checks copied verbatim.
- Inline `curl` to third parties (Convox, WhatsApp/Dootiq, Paytm, PayU, S3, SMTP) → keep exact URLs, headers,
  payloads, token-caching logic. Secrets/config move to `process.env.*` with the current PHP values as defaults
  (document each var in a comment). Token caches: use a module-level in-memory cache + `/tmp` JSON file fallback
  (same shape as the PHP storage/*.json files).
- File uploads: `await request.formData()`.
- Keep query param & body **names identical** to what PHP expected, so behaviour is 1:1.
- Big pages: split into components under `components/<module>/…` — keep each file < ~500 lines.

## Error handling standard
- API routes: wrap logic in try/catch → `NextResponse.json({ success:false, message }, { status })`. Never leak stack traces. Validate inputs first (400 on bad input).
- Pages: `loading` → `<PageLoader/>`, `error` → `<ErrorState onRetry/>`, `[]` → `<EmptyState/>`; mutations → `useToast()` success/error; disable buttons while submitting.

## Route map (php → next)
login→/login, dashboard→/dashboard, lead→/leads, client_info→/client-info?loan_no=… (mirror PHP query params),
assign_lead→/assign-lead, collection→/collection, ptp_details→/ptp, settings→/settings, noc→/noc.
API: keep resource names, e.g. get_loans.php→/api/loans, get_ptp_list.php→/api/ptp/list,
whatsapp_send.php→/api/whatsapp/send, tracking_ping.php→/api/tracking/ping, dootiq_webhook.php→/api/webhooks/dootiq,
generate_payment_link_paytm.php→/api/payment-link/paytm, etc. Public (no-auth) API routes must be added to
PUBLIC_API in middleware.js if the PHP had no session check (webhooks, noc tracking pixel).
