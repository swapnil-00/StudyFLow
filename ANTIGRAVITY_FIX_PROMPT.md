# Prompt for Antigravity — Fix StudyFlow Security Findings and Harden to Production SaaS

Copy everything below the line into Antigravity.

---

## ROLE

You are a senior full-stack security engineer. You are fixing the StudyFlow SaaS app (a study-library management system: vanilla-JS SPA + Vercel serverless functions in `api/` + Neon PostgreSQL via `pg`). Your job is to fix every finding in `SECURITY_AUDIT_REPORT.md` and bring the app to a production-ready multi-tenant SaaS standard. You must not break existing features.

## FIRST STEP — READ BEFORE CODING

1. Read `SECURITY_AUDIT_REPORT.md` in the repo root in full. It lists 35 findings (SEC-001 … SEC-035) with file paths, line numbers, root causes and recommended fixes. It is your source of truth.
2. Read every file in `api/`, `db/`, `server.js`, `build.js`, `vercel.json`, `js/store.js`, `js/app.js`, `js/services/*`, and `js/pages/*`.
3. Before changing anything, produce a short implementation plan grouped by the phases below, and list any decisions that need my input. Then proceed. Don't stop for approval on things this prompt already decides.

## HARD RULES

- **Never run tests, migrations or scripts against the production database.** The `DATABASE_URL` in `.env` is production. Create and use `TEST_DATABASE_URL` (a separate Neon branch or local Postgres). Make the test runner refuse to start if `TEST_DATABASE_URL` is missing or equals `DATABASE_URL`. If I haven't given you a test database yet, ask me for one before running any DB-touching test. You can write the tests without it.
- **Never commit secrets.** Don't print `.env` values. Don't hardcode any secret or fallback secret.
- **Keep the stack.** Vanilla JS frontend, `build.js` bundler, Vercel serverless, Neon/pg. No framework rewrite. Adding small, well-maintained dependencies is fine (e.g. `zod` for validation, `jose` for JWT). Justify each one and commit `package-lock.json`.
- **Preserve functionality.** Every existing page and flow must still work after each phase: login, register, onboarding, dashboard, seat map, layout editor, students, student profile, memberships, payments, invoices, floors, expenses, reports, staff, notifications, activity and settings.
- **Fail closed.** Missing auth → 401. Missing permission → 403. Resource not in the caller's tenant → 404. Missing required env var → refuse to start.
- **Commit per phase** with clear messages that reference the SEC IDs fixed. Don't squash everything into one commit. Don't push or deploy unless I say so.
- A finding is **not fixed** just because code changed. For each finding: write a test that reproduces the attack (it fails before the fix), apply the fix, then show that the test passes and nothing regressed.
- **Don't fake anything.** If something needs me (Vercel dashboard, Neon console, secret rotation), don't pretend it's done. Add it to the "Manual actions for owner" list (Phase 9).

## ARCHITECTURE DECISIONS (ALREADY MADE — FOLLOW THEM)

1. **Central security layer in `lib/` (not `api/`)**, so Vercel doesn't deploy helpers as endpoints (SEC-031). Move `api/db.js`, `api/db-init.js` and `api/auth-util.js` into `lib/`. Create:
   - `lib/auth.js`: `requireSession(req)` returns `{userId, orgId, role, branchIds}` or throws `HttpError(401)`. Tokens are verified with `jose` (HS256) against a required `JWT_SECRET` of at least 32 bytes, with `alg` pinned. The user row is re-checked, and the token's `tv` must match `users.token_version`.
   - `lib/authorize.js`: one permission matrix `can(role, resource, action)`, plus `assertBranchAccess(session, branchId)`.
   - `lib/validate.js`: a `zod` schema for every table/action payload.
   - `lib/http.js`: `withHandler(fn, {methods, auth})` wrapper. It handles method allow-listing, JSON content-type checks, body size limits, `HttpError` → safe JSON response, a correlation ID, server-side error logging, and `Cache-Control: no-store`. It never returns `err.message` to the client (SEC-021).
   - `lib/audit.js`: `audit(client, session, action, entityType, entityId, meta)`. It writes inside the same transaction as the mutation (SEC-023).
   - `lib/ratelimit.js`: a Postgres-backed limiter (a table keyed by IP/account/window). Don't use an in-memory limiter, because it's unreliable on serverless (SEC-014).
2. **Sessions: HttpOnly cookie.** Issue a short-lived access token (15 min) plus a refresh token (7 days, rotating, stored hashed in a `sessions` table) as `HttpOnly; Secure; SameSite=Lax; Path=/` cookies. Remove all `localStorage` token storage from `js/store.js`. Accept tokens **only** from the cookie; delete the `?token=` and body-token paths. For CSRF, require `Content-Type: application/json` and verify the `Origin` header equals the app origin on every state-changing request. Logout and password change revoke sessions (increment `token_version`, delete refresh rows) (SEC-013).
3. **Tenant identity comes only from the verified session.** Delete every `req.query.orgId`, `req.body.orgId`, `req.body.organizationId` and `'ORG-DEFAULT'` fallback (SEC-001, SEC-002). Reject bodies that contain `orgId`/`organizationId`.
4. **Defence in depth with PostgreSQL Row-Level Security.** Enable RLS on every tenant table with the policy `organization_id = current_setting('app.org_id')`. The API runs each request in a transaction that first runs `SELECT set_config('app.org_id', $1, true)`. Keep the explicit `WHERE organization_id = $n` predicates too.
5. **Server-generated IDs only** (`crypto.randomUUID()`-based, keeping the existing prefixes, e.g. `STU-<uuid>`). Ignore client-supplied `id` on insert (SEC-009, SEC-032).
6. **Roles:** `owner`, `manager`, `staff`. Staff become real `users` rows linked to the `staff` table. They get a `user_branches` mapping and branch-scoped access, and they can't access settings, plans, staff management or destructive deletes. The owner creates staff logins with a temporary password, and staff must change it on first login (SEC-008).
7. **Payments stay manual** (there's no gateway). Payments are append-only; corrections happen through `void`/`refund` entries that reference the original. Plan upgrades via `upgrade_plan` are **disabled** for tenants (SEC-011). Replace them with a server-only admin CLI script (`scripts/set-plan.js`) and a "Contact us to upgrade" UI. Build a verified payment-gateway webhook only if I later provide gateway keys.
8. **WhatsApp:** all provider calls go server-side. Tenant provider credentials are stored encrypted (AES-256-GCM with `CREDENTIALS_ENCRYPTION_KEY` env) in a dedicated column. They're write-only from the UI (the UI shows "configured ✓" and never the value), and they're never returned by any API. Remove the browser-side Twilio call (SEC-022).

## PHASES — DO THEM IN THIS ORDER

### Phase 0 — Safety net
- Set up the test infrastructure (`node --test`, `TEST_DATABASE_URL` guard, a fixture that creates two tenants, A and B, each with owner/manager/staff users and two branches).
- Rewrite `test/api.test.js`. It currently asserts that `/api/data` works without a token, which encodes SEC-001 as expected behaviour.
- Commit the lockfile (SEC-028). Run `npm prune`.

### Phase 1 — Critical (SEC-001 … SEC-005)
- Delete `api/students.js` (SEC-003).
- Create `lib/` (decisions 1–3). Wrap `api/data.js`, `api/write.js`, `api/notify.js` and `api/auth.js` in `withHandler` with required auth (except register/login/refresh).
- Remove the JWT secret fallback, and make startup fail without `JWT_SECRET` (SEC-004). Add `JWT_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` and `TEST_DATABASE_URL` to `.env.example` with placeholders and comments.
- `/api/notify` (SEC-005, SEC-006, SEC-029):
  - Require a session.
  - Accept `studentId` (not a phone number) and resolve the phone server-side within the tenant. Enforce `whatsapp_opt_in` and the communication preferences.
  - Apply a per-tenant rate limit.
  - Validate `phoneNumberId` as `^\d+$` (from server config only).
  - Never return upstream error `details`.
  - Write a `communication_logs` row server-side with an idempotency key.
  - In production with no credentials, return `503 not_configured` instead of a mock "SENT".
- Tests: every endpoint returns 401 anonymously. Tenant A can never read or write Tenant B, including when passing `orgId`. A token signed with the old fallback secret is rejected. `/api/students` returns 404.

### Phase 2 — XSS and frontend (SEC-007, SEC-020, SEC-026)
- Add `escapeHtml()`/`escapeAttr()` to the frontend utilities and apply them to **every** interpolated value in every `innerHTML`, template literal and `document.write` (the invoice print window).
- Replace inline `onclick="fn('${id}')"` with `data-*` attributes and delegated event listeners.
- Move the inline `<script>` in `index.html` into the bundle so CSP needs no `'unsafe-inline'` for scripts.
- Layout editor: validate `evt.origin === 'https://embed.diagrams.net'` and `evt.source`, and post with an explicit target origin.
- Remove the unused vendored `drawio/` and `public/drawio/` (SEC-027), or switch the editor to the self-hosted copy. Pick one and explain why.
- Headers in `vercel.json`:
  - Add a CSP (start in `Content-Security-Policy-Report-Only`, then enforce once clean), `Strict-Transport-Security`, `Permissions-Policy`, and `Cache-Control: no-store` for `/api/*`.
  - Remove `X-XSS-Protection` and the forced `Content-Type` overrides on `/js` and `/css` (SEC-033).
  - Remove the unneeded path rewrites, since the app uses hash routing.
- Test: seed a student, plan, branch, expense and document whose text fields contain `<img src=x onerror=alert(1)>` and `'"><svg onload=alert(1)>`. Render every page and the print view (a headless browser such as Playwright is fine) and assert no script executes. Clean up test data.

### Phase 3 — Authorization, RBAC, branches (SEC-008, SEC-009)
- Build the permission matrix and branch scoping from decision 6. Add `user_branches`, staff login creation, and forced password change.
- For every foreign ID in every write (`studentId`, `seatId`, `membershipId`, `branchId`, `floorId`, `roomId`, `planId`), verify it belongs to the caller's tenant (and branch, for non-owners) inside the transaction. Otherwise return 404.
- Fix the documents upsert so it can never cross tenants. In `mapDocument`, spread `document_data` first and trusted columns last.
- Split `/api/data` so non-owner roles only receive data for their branches. Add pagination/limits (SEC-030).
- Make onboarding idempotent: reject it if already completed.
- Tests: the full role × resource × action matrix, cross-branch denial, and cross-tenant foreign-ID denial.

### Phase 4 — Business logic and financial integrity (SEC-010, SEC-011, SEC-016)
- Add `zod` validation for every payload (types, lengths, enums, date formats, money as a positive decimal with at most 2 dp and a sane maximum).
- Status fields are set by the server only.
- Compute the membership `final_amount` server-side from the plan and discount. Price and amounts are immutable once paid.
- Payments are append-only, with void/refund entries. Add an `Idempotency-Key` header on payment insert. Unique `reference_number` per tenant when present.
- Money: sum in SQL. Return amounts as strings or integer paise, and stop client-side float totals in reports.
- Seats:
  - Remove `status`/`currentStudentId` from `seats/update`.
  - Assign, transfer and release lock the **seat row** `FOR UPDATE` and validate seat existence, tenant, branch access, seat not in maintenance/inactive, student active, and membership active and unexpired.
  - Transfer must not fall back to "any assignment of this student".
  - Send the response only **after** the transaction commits.
- Enforce one active seat per student if that matches current behaviour (check the UI first and tell me).
- Make the seat-limit check atomic (inside a transaction with a lock on the organization row).
- Disable tenant `upgrade_plan` (decision 7).
- Tests: 20 concurrent assigns of one seat → exactly 1 success. Negative, zero, huge and non-numeric amounts → 400. Duplicate idempotency key → same payment returned. Editing a paid membership's amount → 409. `upgrade_plan` → 403.

### Phase 5 — Authentication hardening (SEC-013, SEC-014, SEC-015, SEC-034)
- Implement the cookie sessions, refresh rotation and revocation from decision 2.
- Hash passwords with `crypto.scrypt` (async) and strong parameters. Transparently rehash legacy PBKDF2 hashes on successful login. Use `crypto.timingSafeEqual` everywhere.
- Rate limit login, register and refresh per IP and per account, with backoff.
- Use a generic registration response (no "email already exists" enumeration). Require passwords of at least 10 characters, checked against a common-password list.
- Validate email format and field lengths. Generate unique org slugs safely without leaking DB errors.
- Add a password-reset flow only if an email provider is configured. Otherwise document it as a follow-up, and don't build an insecure one.
- Tests: an old session is invalid after a password change and after logout; brute force → 429; timing-safe compare is used.

### Phase 6 — Database hardening (SEC-017, SEC-018, SEC-019)
- Replace `ensureMultiTenantSchema()` runtime DDL with versioned SQL migrations (`db/migrations/NNN_*.sql` plus a runner with a `schema_migrations` table) that run at deploy time, not per request.
- Migrations must be non-destructive and safe for existing production data. Write each one to be re-runnable, and include a rollback note.
- Constraints:
  - `organization_id NOT NULL REFERENCES organizations(id)` with no default.
  - Composite tenant FKs where practical.
  - `ON DELETE RESTRICT` for payments and documents.
  - Soft-delete students (`deleted_at`) instead of hard delete.
  - `CHECK (amount > 0)` and status enums.
  - Migrate date `VARCHAR` columns to `DATE`/`TIMESTAMPTZ` with data conversion.
  - `UNIQUE (organization_id, document_number)`.
  - Make sure `idx_unique_active_seat` exists.
  - RLS policies (decision 4).
- `ORG-DEFAULT`: write `scripts/claim-default-org.js`, which creates a real owner account for the existing default library. Don't delete its data.
- DB TLS: `ssl: { rejectUnauthorized: true }`, and keep `channel_binding` (SEC-017).
- Write the SQL to create a least-privilege `studyflow_app` role (DML only, no DDL) as a script for me to run. Document which URL uses which role.

### Phase 7 — Secrets, WhatsApp settings, logging (SEC-021, SEC-022, SEC-023, SEC-025)
- Implement encrypted, write-only provider credentials (decision 8).
- Settings: allow-list the keys, and stop spreading arbitrary stored JSON into responses.
- Server-side audit log for: login success/failure, logout, password change, role/staff changes, student create/update/delete, seat assign/transfer/release, payment create/void/refund, membership changes, document creation, notification send and settings changes. Make the audit table append-only for the app role. Never log passwords, tokens, provider credentials or full ID-proof numbers.
- Remove the client `activity_logs/insert` path, or restrict it to non-security UI events clearly separated from the audit log.
- CORS: remove the wildcard. The app is same-origin, so either send no CORS headers or allow-list the production origin only.
- Mask `id_proof` in API responses (last 4 characters only), with the full value visible to owners only.

### Phase 8 — Dev server, build and deployment (SEC-012, SEC-031, SEC-033, SEC-035)
- `server.js`: serve static files only from `public/`, deny dotfiles, bind to `127.0.0.1` by default (`HOST` env to override), add a body size limit, and mirror the Vercel headers.
- Add `public/` and `js/bundle.js` to `.gitignore` and remove them from the index (`git rm --cached`). Vercel builds them.
- Make sure only real handlers live in `api/`.
- Confirm the build output: `/js/*.js` → JS, `/css/*.css` → CSS, `/api/*` → functions, unknown asset → 404 (never HTML). Run a local production build and check this.

### Phase 9 — Verification and re-audit
- Run the full test suite against the test DB, plus `npm audit --omit=dev`. Grep the built bundle for secrets and `process.env`.
- Re-run every attack from the report as automated tests:
  - anonymous → every API
  - Tenant A → Tenant B
  - staff → owner functions
  - Branch A → Branch B
  - IDOR on every ID type
  - mass assignment
  - XSS payloads
  - double seat booking
  - duplicate/negative payment
  - brute force
  - forged token
  - information disclosure in errors
- Update `SECURITY_AUDIT_REPORT.md`: set each finding's Status to `Fixed (verified by <test name>)`, `Partially fixed`, or `Open — needs owner action`, and add a "Remediation Summary" section at the end. Don't delete the original findings.
- Produce these final deliverables:
  1. Files changed, per phase
  2. Database migrations added, and how to run them safely on production (backup/branch first)
  3. New and changed environment variables
  4. Deployment changes
  5. Test results (paste the output)
  6. Remaining risks
  7. **Manual actions for owner.** At minimum:
     - Generate and set `JWT_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` in Vercel (Production and Preview, different values).
     - Rotate the Neon database password.
     - Create a separate Neon branch for Preview and tests.
     - Run the least-privilege role script.
     - Take a Neon backup/branch before running migrations.
     - Delete or protect old Vercel deployments built with `outputDirectory: "."`.
     - Enable Preview Deployment Protection.
     - Review Vercel logs for past unauthenticated `/api/data` and `/api/students` access (possible data breach, which has DPDP Act 2023 notification implications).
     - Get a legal/privacy review of Aadhaar/ID-proof storage and WhatsApp opt-in defaults.
  8. A final **production readiness gate**:
     - **BLOCKED** items: anything Critical/High not verified fixed.
     - **SAFE TO PROCEED**: only with test evidence.

## QUALITY BAR

- Keep security logic centralized in `lib/`. Handlers stay thin: `withHandler` → `requireSession` → `authorize` → `validate` → transaction (with `set_config` for RLS) → `audit` → response.
- Match the existing code style and naming. Keep it readable, not clever.
- UI changes should be minimal: only what's needed for cookies, staff login, write-only credentials, the upgrade CTA, and escaping. Keep the existing design.
- If a fix would break a feature, stop and explain the trade-off. Don't silently remove the feature.
- Don't mark the app production-ready just because it builds. Evidence only.
