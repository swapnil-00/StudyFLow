# StudyFlow — Security Remediation Verification Review

| | |
|---|---|
| **Review date** | 2026-09-28 |
| **Baseline** | `SECURITY_AUDIT_REPORT.md` (35 findings, commit `691b54f`) |
| **Reviewed state** | Uncommitted working tree on `main`. New files (`lib/`, `scripts/`, `db/migrations/`, `db/least-privilege.sql`, `js/utils.js`, `package-lock.json`) are **untracked**. |
| **Method** | Line-by-line review of `lib/*`, `api/*`, migrations, scripts, `server.js`, `vercel.json` and the frontend. `npm test` run with `DATABASE_URL` pointed at a dead local address, so production was never contacted. A runtime RBAC probe was run the same way. No code was changed. |

---

## 1. Verdict

**The most dangerous problems are fixed: anonymous access to every tenant's data is closed.** `/api/data`, `/api/write` and `/api/notify` now require a valid token. The tenant comes only from the token. `/api/students` is deleted, and the hardcoded signing secret is gone.

**It is still not production-ready, and it should not be deployed in its current state.** Three reasons:

1. **Stored XSS is mostly not fixed** (SEC-007). The escaping helper is used in only one file. The token is still in `localStorage`, and the CSP is report-only and allows `'unsafe-inline'`.
2. **The fixes introduced functional regressions that break core features.** Verified:
   - Staff and manager accounts can't perform any write.
   - Adding seats fails.
   - Records created in the current session can't be edited until the page is reloaded.
   - Branch edits wipe data.
3. **The database migrations don't apply to the existing production database.** The code now uses columns that production tables don't have, so several operations would return 500 errors after deploy.

| Status | Count | Findings |
|---|---|---|
| ✅ Fixed | 13 | 001, 002, 003, 004, 006, 011, 012, 021, 026, 027, 029, 032, 033 |
| 🟡 Partially fixed | 16 | 005, 008, 009, 010, 014, 015, 016, 018, 019, 020, 022, 023, 024, 028, 031, 034 |
| ❌ Not fixed | 5 | **007**, 013, 017, 025, 030 |
| ⏳ Owner action (can't be verified from code) | 1 | 035 |
| 🆕 New issues introduced | 12 | NEW-01 … NEW-12 (§3) |

**Tests:** 13 of 13 pass. They are unit-level only: no cross-tenant, concurrency, XSS-rendering or end-to-end tests exist. Test *"SEC-011 upgrade_plan"* does reach the database (it calls `ensureMultiTenantSchema()` with a valid token), so running `npm test` with the real `.env` **executes DDL and an INSERT against production**.

---

## 2. Finding-by-Finding Verification

### Critical

| ID | Status | Evidence | Remaining work |
|---|---|---|---|
| SEC-001 | ✅ Fixed | `api/data.js:7-13, 193` uses `withHandler(..., {auth:true})`; `orgId = session.orgId`; anonymous → 401 (test passes) | Minor: see NEW-06 (deleted students still returned) and the staff over-exposure note under SEC-008 |
| SEC-002 | ✅ Fixed | `api/write.js:34-38` requires auth, orgId from session; `lib/http.js:73-82` rejects body `orgId`/`organizationId` | — |
| SEC-003 | ✅ Fixed | `api/students.js` deleted | — |
| SEC-004 | ✅ Fixed (code) | `lib/auth.js:10-20` has no fallback and refuses to load without a secret of at least 32 bytes; the old-secret token is rejected (test passes) | **Set `JWT_SECRET` in Vercel (Production and Preview) before deploying.** Without it, every API function crashes at load. |
| SEC-005 | 🟡 Partial | Auth required; the `studentId` path resolves the phone in-tenant and checks opt-in (`api/notify.js:47-66`) | **`api/notify.js:67-74` still accepts a raw `to` phone number** (the "legacy" path), so any logged-in user can message **any number**. Registration is free and instant, so "logged in" ≈ anyone. No rate limit, no role check, `communication_preferences` ignored, idempotency key uses `Date.now()` (never deduplicates). **Still High.** The frontend already sends `studentId`, so the legacy path can simply be deleted. |

### High

| ID | Status | Evidence | Remaining work |
|---|---|---|---|
| SEC-006 | ✅ Fixed | Credentials only from env; `phoneNumberId` validated `^\d+$` and `encodeURIComponent`-ed; upstream errors logged, not returned (`notify.js:27-43, 130, 142-150`) | — |
| SEC-007 | ❌ **Not fixed** | `js/utils.js` defines a correct `escapeHtml`, but it is **used only in `invoice-generator.js`**. `js/app.js`, `js/store.js` and every page file except `layout-editor.js` are unchanged. Examples still raw: `students.js:163` (name), `student-profile.js:41,127,441`, `payments.js:94`, `seat-map.js:420-445`, `staff.js:32-39`, `settings.js:146-156`, `activity.js:42-46`. The toast/modal/confirm helpers (`app.js:1157, 1181-1187, 1212, 1255-1260`) render raw HTML, and callers pass names (e.g. `students.js:218`). Name-in-onclick is still exploitable (`memberships.js:69,186`, `staff.js:42`: only `'` is escaped). Invoice amount fields (`invoice-generator.js:216,238,242`) are raw, and `document_data` is unvalidated client JSON → XSS in the preview and in the print window. Server-side `sanitizeString` only trims/truncates, so it doesn't stop XSS payloads. | Apply `escapeHtml` to every interpolation across `app.js` and `js/pages/*`, including the toast/modal/confirm helpers. Replace name-bearing inline `onclick` with `data-*` attributes and listeners. Escape the invoice amounts and validate the `documents` payload server-side. **Still High, and still the main account-takeover path.** |
| SEC-008 | 🟡 Partial, **broken** | `lib/authorize.js` has a role matrix; `api/data.js` filters by branch for non-owners; `create_staff_user` exists | **The matrix uses `create`/`read`, but `write.js` checks the literal action names (`insert`, `save`, `markRead`, `batch_update_positions`), so every staff and manager write returns 403** (verified at runtime, see NEW-01). Other gaps: `assertForeignEntity` never compares `branch_id`, so update-by-ID of another branch's record isn't blocked; `transfer` checks no branch; `create_staff_user` doesn't validate `role` or that `branchIds` belong to the tenant; no forced password change; `requireSession` doesn't reload role/branches from the DB, so demoting or removing a user takes effect only when their 30-day token expires. `data.js` returns notifications, seat transfers and **communication logs (phone numbers + message bodies)** to staff across all branches (`data.js:181,185,187`). |
| SEC-009 | 🟡 Mostly fixed | Server-generated IDs everywhere (`write.js:14`); `assertForeignEntity` on every foreign ID; documents upsert constrained to the tenant; `mapDocument` spreads untrusted data first | The frontend still caches its own client IDs and ignores the server's `id` (NEW-02). No branch-level check inside `assertForeignEntity`. |
| SEC-010 | 🟡 Partial | Payments: amount validated, mode allow-listed, status server-set, insert-only, optional `Idempotency-Key` (`write.js:592-635`, `lib/validate.js:151-173`). Paid-membership amounts locked (`write.js:405-408`). | **Memberships have no validator:** `price`/`discount` come from the client and aren't derived from the plan. `paymentStatus: 'paid'` can still be set via `memberships/update` **with no payment** (`write.js:410`), and the frontend does exactly that (`store.js:817`). Any payment amount (e.g. ₹1) marks a linked membership paid (`write.js:623-628`). `membership_plans` has no validator. Deleting a membership still detaches its payments (`write.js:434`). No void/refund path. |
| SEC-011 | ✅ Fixed | `api/auth.js:275-279` → 403; `scripts/set-plan.js` for admin use | The frontend still offers the upgrade button (returns an error); swap it for "Contact us". |
| SEC-012 | ✅ Fixed | `server.js` binds `127.0.0.1`, denies dotfiles, serves only `public/` plus `/css`, `/js`, `/assets`, 1 MB body limit | — |

### Medium

| ID | Status | Evidence / remaining work |
|---|---|---|
| SEC-013 | ❌ Not fixed | Tokens are still 30-day bearer tokens in `localStorage` (`store.js:9,108,127`); no cookies; `sessions` table unused. `update_profile` increments `token_version`, but **`requireSession` never checks it**, so password change and logout revoke nothing. Only the `?token=`/body-token paths were removed ✅. |
| SEC-014 | 🟡 Partial | Password policy added ✅. Login is limited **per email only** (5 per 5 min): no per-IP limit, so credential stuffing across many emails is unlimited, **and anyone can lock any user out by spamming their email**. Register still returns 409 "account exists" (enumeration). The limiter fails **open** on any DB error and runs `CREATE TABLE` on every call, so under the least-privilege role it will silently stop limiting (NEW-05). |
| SEC-015 | 🟡 Mostly fixed | scrypt plus `timingSafeEqual` for hashes and signatures ✅; legacy PBKDF2 rehashed on login ✅. `N=16384` is below the OWASP recommendation (`N=2^17, r=8, p=1`). `scryptSync` blocks the event loop; prefer async `crypto.scrypt`. Login with an unknown email skips hashing (timing-based enumeration). |
| SEC-016 | 🟡 Mostly fixed | Seat row locked `FOR UPDATE`, status server-set, `seats/update` can't touch `status`/`current_student_id`, one active seat per student, strict transfer source ✅. Remaining: membership validity (active/unexpired/same student) not checked; students with `status='deleted'` can be assigned (only `inactive` is blocked); transfer has no branch check; `idx_unique_active_seat` still needs confirming in production. |
| SEC-017 | ❌ Not fixed | `lib/db.js:15-21` and `scripts/migrate-runner.js:12-19` still set `rejectUnauthorized: false` and strip `channel_binding`. |
| SEC-018 | 🟡 Partial | Migration runner and `db/least-privilege.sql` added ✅. **`ensureMultiTenantSchema()` still runs DDL on every cold start** (`lib/db-init.js`, called from `auth.js:21`, `data.js:9`, `write.js:35`), and `lib/ratelimit.js:18` runs `CREATE TABLE` per request. Both are incompatible with the least-privilege role: db-init silently fails, the rate limiter silently disables itself. db-init still adds `organization_id DEFAULT 'ORG-DEFAULT'`. |
| SEC-019 | 🟡 Partial, **not effective on production** | `001_initial_schema.sql` uses `CREATE TABLE IF NOT EXISTS`, which is a **no-op on existing production tables**. None of the new CHECKs, RESTRICT FKs, DATE types, `deleted_at`, `token_version`, `capacity`, `updated_at` or `id_proof_type` columns will be added. The code already uses those columns (NEW-04). `organization_id` is still nullable everywhere, and `communication_logs.deliveredAt` is a typo for `delivered_at`. Soft delete for students ✅ (in code). |
| SEC-020 | 🟡 Partial | HSTS, Permissions-Policy and API `no-store` added; `X-XSS-Protection` removed ✅. **The CSP is `Report-Only` and has `script-src 'unsafe-inline'`, so it gives no XSS protection.** It can only be enforced once the ~270 inline handlers are removed. |
| SEC-021 | ✅ Fixed | `lib/http.js:106-125` returns generic 500s with a correlation ID; details are logged server-side. |
| SEC-022 | 🟡 Mostly fixed | No provider calls from the browser; `/api/notify` uses only env credentials; tenant token AES-256-GCM encrypted ✅. Remaining: the encrypted tenant token is **never used**, so the Settings field is dead, and all tenants send from the platform's single WhatsApp number. Until reload the token stays in the in-memory cache and is rendered raw into `value=""`. `lib/crypto.js:13-17` falls back to `JWT_SECRET` as the encryption key (key reuse): make `CREDENTIALS_ENCRYPTION_KEY` mandatory. The settings allow-list expects `whatsappProvider`, but the UI sends `waProvider`/`waPhoneId`/`waAccId`, so those are silently dropped. |
| SEC-023 | 🟡 Partial | Server-side `audit()` inside the transaction for most mutations ✅. Missing: login success/failure, password change, staff-user creation, notification sends, markRead. The Activity page still reads `activity_logs` (now never written, because the client insert returns 400), so **the Activity page stops showing new events**. If migration 001 hasn't run, `audit_logs` doesn't exist and, because audit failure rolls back the transaction, **every write fails**. |
| SEC-024 | 🟡 Partial | Guard skips live-DB tests without `TEST_DATABASE_URL` ✅. But test *SEC-011* reaches `DATABASE_URL` (production) through `ensureMultiTenantSchema()`. No cross-tenant, concurrency, branch or XSS-render tests exist; the RBAC test calls `can()` with abstract names, so it didn't catch NEW-01. |
| SEC-025 | ❌ Not fixed | `lib/http.js:40` and `api/db.js:10` still send `Access-Control-Allow-Origin: *`. |
| SEC-026 | ✅ Fixed | `layout-editor.js:127-128` checks origin and source; posts target `DRAWIO_ORIGIN`. |
| SEC-035 | ⏳ Owner | Old Vercel deployments can't be verified from code. |

### Low

| ID | Status | Notes |
|---|---|---|
| SEC-027 | ✅ Fixed | `drawio/` and `public/drawio/` removed |
| SEC-028 | 🟡 Partial | `package-lock.json` is no longer ignored but is **untracked**. Commit it, and use `npm ci`. |
| SEC-029 | ✅ Fixed | 503 `NOT_CONFIGURED` instead of mock "SENT" |
| SEC-030 | ❌ Not fixed | `/api/data` still returns every row of every table, with no pagination |
| SEC-031 | 🟡 Partial | Code moved to `lib/`, but shims `api/db.js`, `api/db-init.js`, `api/auth-util.js` remain and are still deployed as functions. Delete them (only `server.js` references `./api/db.js`). |
| SEC-032 | ✅ Fixed | `crypto.randomUUID()`-based IDs, server-side |
| SEC-033 | ✅ Fixed | `public/` and `js/bundle.js` git-ignored and staged for removal; forced Content-Type overrides removed. The 13 path rewrites remain (harmless with hash routing). |
| SEC-034 | 🟡 Partial | Password strength ✅. No email format/length validation; register reveals existing accounts. |

---

## 3. New Issues Introduced by the Fixes

| ID | Severity | Issue | Evidence | Fix |
|---|---|---|---|---|
| **NEW-01** | **High (functional)** | **RBAC action-name mismatch: staff and managers cannot write anything.** | `write.js:46` calls `assertCan(session, table, action)` with `insert`/`save`/`markRead`/`batch_update_positions`/`release`; `lib/authorize.js` grants `create`/`update`/... Runtime probe: `staff students/insert → 403`, `staff payments/insert → 403`, `staff documents/save → 403`, `manager seats/batch_update_positions → 403`, `manager notifications/markRead → 403`. | Map write actions to permission verbs (`insert,save→create`, `markRead→update`, `batch_update_positions→update`, `release/transfer→` their own verbs) or rename the matrix entries. Add a test that drives `write.js` with staff tokens. |
| **NEW-02** | **High (functional)** | **The client ignores server-generated IDs.** | `store.js` builds records with its own `uid()` (lines 218, 242, 280, 355, 439, 496, 535, 804, 872, 976) and never reads the `id` the server returns (only seat assign/transfer do). Any follow-up action on a just-created student, seat, plan, membership or payment hits `assertForeignEntity` → 404 until the page is reloaded. | Use `res.id` from `apiWrite` to set the cached record's ID (or reload the cache after inserts). |
| **NEW-03** | **High (functional / data loss)** | **Validator and handler field mismatches with the frontend.** | **Seats:** the client sends `label`/`number`/`position`, but the validator requires `seatNumber` → **adding seats returns 400**. There's no `batch_insert` handler → "add row" fails. `batch_update_positions` reads `data.seats` but the client sends an array → silently updates 0. `seats/update` writes `seat_number`, `seat_type` and the position unconditionally → a position-only update sets `seat_number=undefined` (NOT NULL error) or resets the type/position. **Branches:** the validator drops `city`/`status`/`openTime`/`closeTime`, and the handler writes defaults → **every branch edit wipes the city and resets hours/status**. **Rooms:** the client sends `type`, the validator expects `roomType`; `capacity` is dropped → reset to 0. **Students:** the validator drops `idProof` (the client's field), `status` (so **deactivating a student does nothing**), `country_code`, `avatar`. | Align each validator with the payload `js/store.js` actually sends, and make update handlers write only the fields present (like `students/update` already does). Add end-to-end tests per page action. |
| **NEW-04** | **High (deploy blocker)** | **The code uses columns that don't exist in the production schema.** | `students.deleted_at`, `students.updated_at` (`write.js:307,318`), `branches.capacity`, `branches.updated_at` (`write.js:63,77`), `users.token_version` (`auth.js:300`), `settings.encrypted_credentials` (only in 002). Migration 001's `CREATE TABLE IF NOT EXISTS` won't add them to existing tables → **500s on student edit/delete, branch create/edit and password change.** | Write a migration `004_*` with `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` for every new column, plus the constraints (using `NOT VALID` then `VALIDATE` where existing data may violate them). Test it on a Neon branch copied from production. |
| NEW-05 | Medium | The rate limiter fails open and runs DDL per call | `lib/ratelimit.js:16-54` | Create `rate_limits` in a migration only; decide whether to fail closed for login; add per-IP limits and per-account backoff instead of hard lockout. |
| NEW-06 | Medium | Soft-deleted students are still returned and shown | `data.js:33` has no `deleted_at IS NULL` filter | Filter out deleted students (keep them for history views only). |
| NEW-07 | Medium (functional) | Operations the client still sends now return 400 | `activity_logs/insert`, `communication_logs/save`, **`waitlist/insert` (waitlist feature broken)**; the client ignores the errors | Add handlers or remove the client calls; point the Activity page at `audit_logs`. |
| NEW-08 | Medium | Row-Level Security is decorative | No code calls `set_config('app.org_id', …)`. The policy (`003_row_level_security.sql`) **allows everything when the setting is unset**, and the table owner bypasses RLS without `FORCE ROW LEVEL SECURITY`. | Set `app.org_id` at the start of every request transaction; remove the "unset → allow" clause for the app role; use `FORCE ROW LEVEL SECURITY` or run the app as a non-owner role. |
| NEW-09 | Medium | Role/branch changes and password resets don't take effect for 30 days | `requireSession` trusts `role`/`branchIds` in the token without a DB lookup | Load user status/role/branches/`token_version` per request (cheap indexed query) or shorten tokens to ~15 min. |
| NEW-10 | Low | `create_staff_user` accepts any `role` string and any `branchIds` | `auth.js:318-349` | Allow-list roles (`manager`, `staff`); verify each branch belongs to `session.orgId`; link to the `staff` row; force a password change on first login. |
| NEW-11 | Low | Draw.io XML injection | `layout-editor.js:48,57`: seat labels and room names go raw into XML with `html=1` | XML-escape the attributes. |
| NEW-12 | Low | `claim-default-org.js` moves an existing user out of their tenant | `scripts/claim-default-org.js:37` reassigns `organization_id` and resets the password if the email exists | Refuse when the email already belongs to another organization. |

---

## 4. Before You Deploy — Required Order

1. **Commit everything.** `lib/`, `scripts/`, `db/migrations/`, `js/utils.js` and `package-lock.json` are untracked. A deploy from git without them crashes every API route (`require('../lib/...')` fails).
2. Fix **NEW-01, NEW-02, NEW-03** and test every page action with owner, manager and staff accounts.
3. Write the `ALTER TABLE` migration (**NEW-04**). Run it on a **Neon branch copied from production**, then on production after a backup.
4. Finish **SEC-007** (escape everything, including the toast/modal/confirm helpers and the invoice amounts) and **SEC-005** (delete the raw `to` path, add a rate limit).
5. Set `JWT_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` in Vercel (different values for Production and Preview). Make the encryption key mandatory.
6. Then the remaining partials: SEC-013 (short-lived tokens + `token_version` check), SEC-017 (DB TLS verification), SEC-018 (remove runtime DDL), SEC-025 (CORS), NEW-08 (RLS wiring), SEC-030 (pagination).
7. Add the missing tests: cross-tenant, staff/manager write matrix via `write.js`, 20-way concurrent seat assignment, XSS rendering. Remove the DB call from the `upgrade_plan` test.

## 5. Production Readiness Gate

**BLOCKED.**

- **Security:** SEC-007 (stored XSS → account takeover), SEC-005 (messaging relay to arbitrary numbers).
- **Stability:** NEW-01 through NEW-04 (core features broken; production schema mismatch).
- **Owner actions:** the secrets in Vercel, SEC-035 (old deployments), and the Neon password rotation from the original report are still outstanding.

What can honestly be said now: **the unauthenticated, cross-tenant data exposure (the original Critical findings) is closed in code.** Once the items above are done and verified by tests, re-run this review.
