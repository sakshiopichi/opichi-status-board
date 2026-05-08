# [2026-05-08]

## Fixed
- `app/api/proxy/route.js` + `lib/services.js`: Railway now uses their JSON API (`/api/status`) instead of HTML scraping. The previous approach extracted incident names but produced no update text because it couldn't parse HTML content into structured updates. The new API returns `activeIncidents` with titles, status (INVESTIGATING/IDENTIFIED/MONITORING), latest update message, and affected component names — all now displayed in the incident card.

---

# [2026-04-15]

## Changed
- `app/page.js` + `components/ServiceCard.jsx`: AWS, GCP, and Railway now stay in the Operational column with amber partial-impact styling instead of moving to Active Issues. When expanded, the card lists exactly which services/incidents are affected (e.g. "DynamoDB", "EC2" for AWS). Error and warn states still route to Active Issues. This avoids the false implication that an entire platform is down when only specific services are affected.

## Fixed
- `lib/services.js` + `app/api/proxy/route.js`: Railway now scrapes `status.railway.com` instead of pinging `railway.app`. The proxy fetches their SSR HTML and extracts `data-severity` attributes and incident titles, returning synthetic Atlassian-format JSON. Railway's actual service status (degraded, outage, maintenance) now shows correctly instead of always showing Operational.

## Added
- `prisma/schema.prisma` + `prisma/migrations/20260415000000_add_status_cache`: New `StatusCache` table — one row per service (`svcId` unique), stores `data` (JSONB), `error` (TEXT), and `fetchedAt` timestamp.
- `app/api/cron/route.js`: POST endpoint protected by `x-cron-secret` header (matches `CRON_SECRET` env var). Fetches every built-in service plus all distinct catalog services added by any user, proxies each through `/api/proxy`, and upserts the result to `StatusCache`. Designed to be called by Railway's built-in cron on a schedule.
- `app/api/status-cache/route.js`: Session-authenticated GET endpoint. Returns all `StatusCache` rows as `{ [svcId]: { data, error, fetchedAt } }`. Used by the dashboard on init.
- `app/page.js`: `init()` now fetches `/api/status-cache` in parallel with preferences and custom services. If cache is populated, `svcData` is seeded immediately so the first render shows real service statuses without waiting for the refresh cycle. `refreshAll()` still runs afterward to get fresh data.
- `proxy.js`: Added `/api/cron` to `PUBLIC_PATHS` so Railway's cron HTTP call is not redirected to login.
- `.env.local`: Added `CRON_SECRET` placeholder — replace with a strong random value in Railway environment variables before deploying.

---

# [2026-04-15]

## Changed
- `app/page.js`: Services with mixed component health now split across both columns. Healthy components stay in Operational; degraded components drive a separate Active Issues card for the same service. Services with no component data (GCP, AWS, Railway) or where all components are degraded continue to go entirely to Active Issues.
- `lib/services.js`: AWS incident parsing now uses `summary` as the incident name (was raw service slug). Extracts `impacted_services` entries where `current > 0`, strips "Amazon"/"AWS" prefix, and surfaces them in the update body. Adds `affectedServices` and `region` fields to incident objects.
- `lib/services.js`: `getAbstract` for AWS events now shows the actual impacted service names + region (e.g. "EC2, DynamoDB · Bahrain") instead of "multiservices me south 1".

---

# [2026-04-09]

## Added
- `lib/services.js`: `getComponents(svc, data)` — returns top-level components only (no `group_id`) for Atlassian-format services. GCP, AWS, and ping services return empty array.
- `components/ServiceCard.jsx`: `CompactServiceCard` now accepts a `components` prop. If the service has components, a chevron appears; tapping expands a compact list with status dots. Non-operational components show their status label; operational ones show only the green dot.
- `app/page.js`: Computes `components` per service via `getComponents`, applies per-user allowlist from `filterPrefs`, passes filtered result to `CompactServiceCard`.
- `prisma/schema.prisma` + `prisma/migrations/20260409000000_add_user_preferences`: New `UserPreferences` table — one row per user, JSONB `preferences` column storing `{ components: { [svcId]: string[] } }`.
- `app/api/preferences/route.js`: GET returns the user's filter preferences; PUT upserts them.
- `components/FilterSettingsModal.jsx`: Modal UI for configuring per-service component visibility — checkboxes per component, select/deselect all per service, active filter count badge, "Clear all filters" action.
- `app/page.js`: Loads filter preferences on init alongside custom services. "Filters" button in navbar opens the modal; an amber dot appears when filters are active. Saving preferences updates state immediately so the dropdown reflects the new filter without a page reload.

## Added
- `lib/services.js`: `getAbstract(svc, incidents, error)` — derives a single human-readable line from a service's incident list. Strips internal ID prefixes ("Incident #4821 — "), truncates at 72 chars, appends count when multiple issues exist.
- `components/ServiceCard.jsx`: `IssueCard` now shows the abstract line by default with a "Details" toggle. Full incident list (title, update body, status, time, badges) is hidden until requested. Removed the mobile/desktop split — both behave identically.

## Changed
- `lib/services.js`: Normalised "All Systems Operational" (and any API description text) to plain "Operational" when the overall status key is `ok`.

---

# [2026-04-08]

## Changed (uncertainty = issue)
- `lib/services.js`: `getServiceStatus` now returns `warn` (not `load`) when data is received but unreadable — wrong shape, missing status field, unexpected format. Each service type validates its expected data structure before returning `ok`. Label changed from "Loading…" to "Checking…" for the no-data state.
- `app/page.js`: `load` (no data yet) stays in the operational column with a distinct pulsing state. `warn` (uncertain data) routes to the issues column — uncertainty is never silently treated as operational.
- `components/ServiceCard.jsx`: Added `warn` status style (amber). `load` dot now pulses to visually distinguish "checking" from confirmed green.

## Changed (severity tiers)
- `components/ServiceCard.jsx`: IssueCard now has three visually distinct tiers based on severity:
  - **Critical** (`maj`/`err`): Red tinted background, red border, shadow, larger icon/text, red-tinted incident details
  - **Warning** (`part`/`deg`): Amber tinted background, amber border, normal size
  - **Maintenance** (`maint`): White background, grey, reduced opacity — clearly secondary

## Changed (noise reduction)
- `app/page.js`: Maintenance-status services (`maint`) now go to the Operational column instead of Active Issues — scheduled maintenance is expected and doesn't need urgent attention.
- `lib/services.js`: Component-level degradations (no formal incident) now collapse into a single summary line ("3 components affected") instead of one entry per status group. Pure maintenance components are excluded entirely from this summary.

## Added
- `prisma/schema.prisma` + `prisma/migrations/20260408000000_add_incident_log`: New `IncidentLog` table tracking every incident that appears in the Active Issues column — records serviceId, serviceName, incidentName, impact, firstSeen, resolvedAt, status.
- `app/api/incidents/route.js`: GET returns full log newest-first. POST syncs current active issues — inserts new incidents, marks disappeared ones as resolved.
- `app/history/page.js`: `/history` page showing all logged incidents split into Active and Resolved sections, accessible to any logged-in user.
- `app/page.js`: After each refresh cycle, syncs active issues to the incident log via POST `/api/incidents`. Added History link in navbar.

## Changed
- `app/page.js`: Removed "Services Status" heading and large all-clear banner. Replaced with a slim single-line toolbar (pulse dot + last-updated timestamp + Add service button). Reduced main padding from `py-6/py-8` to `py-3/py-4` to maximise content above the fold.
- `app/page.js`: Active issue services are now sorted by severity (Major Outage → Error → Partial Outage → Degraded → Maintenance). Within each service, individual incidents are also sorted by severity (Critical → Major → Minor → Maintenance).

---

# [2026-04-06]

## Added
- `lib/catalog.js`: Curated catalog of 12 common developer services (Vercel, Supabase, Stripe, Netlify, Render, DigitalOcean, Sentry, CircleCI, Datadog, Linear, PagerDuty, MongoDB Atlas) that users can add to their personal dashboard.
- `app/api/services/route.js`: GET (list user's custom services) and POST (add by catalogId) — protected, per-user.
- `app/api/services/[id]/route.js`: DELETE endpoint to remove a user's custom service — ownership-checked.
- `components/AddServiceModal.jsx`: Modal UI showing the catalog grid with Add/Remove buttons per service.
- Migration `20260406155754_add_custom_services`: Adds `CustomService` table (userId, catalogId, unique per user+service) with cascade delete.

## Changed
- `prisma/schema.prisma`: Added `CustomService` model and `customServices` relation on `User`.
- `app/api/proxy/route.js`: Added 12 catalog service hostnames to `ALLOWED_HOSTS`.
- `components/ServiceIcon.jsx`: Added `icon` prop — accepts a simple-icons object directly, enabling catalog services to render their brand SVG without being hardcoded in the built-in map.
- `app/page.js`: Loads user's custom services on init, merges with built-in SERVICES, shows them on the dashboard. Added "Add service" button that opens the catalog modal. Add/remove handlers update state and sync the services ref so the next refresh cycle includes all services.
- `lib/prisma.js`: Shared PrismaClient singleton using `@prisma/adapter-pg` (required by Prisma v7 — native engine removed).
- `app/(auth)/login/page.js`: Wrapped in Suspense boundary to fix Next.js 16 `useSearchParams` prerender error.

## Added (2026-04-06 password reset)
- `app/(auth)/forgot-password/page.js`: User enters email → Better Auth sends reset link via Resend from `noreply@notifications.opichi.ai`.
- `app/(auth)/reset-password/page.js`: Reads `?token=` from URL (placed there by Better Auth callback redirect), validates, sets new password, redirects to login.
- `lib/auth.js`: Wired `sendResetPassword` callback — sends branded HTML email via Resend with the Better Auth-generated reset URL.
- `proxy.js`: Added `/forgot-password` and `/reset-password` to public paths.
- `app/(auth)/login/page.js`: Added "Forgot password?" link next to the Password label.
- `.env.local`: Updated `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to production values.

## Added (2026-04-06 follow-up)
- `lib/catalog.js`: Added AWS (Amazon Web Services) — uses `health.aws.amazon.com/public/currentevents`, a custom UTF-16 encoded JSON format.
- `app/api/proxy/route.js`: Added `AWS_HOSTS` handler that reads the response as an ArrayBuffer, detects the BOM (FE FF = UTF-16 BE, FF FE = UTF-16 LE), strips it, and decodes with `TextDecoder` before returning JSON. Initial implementation used LE — corrected to BE after live testing confirmed AWS returns UTF-16 BE.
- `lib/services.js`: Added `isAWS` branch in `getServiceStatus` and `getIncidents` — events with `status === '3'` are active problems; empty array means operational.

## Fixed (2026-04-06 follow-up)
- `app/api/services/route.js` + `[id]/route.js`: Rewrote from PrismaClient (queries failing silently) to `pg` Pool raw SQL — same pattern as `lib/auth.js`. This was the root cause of added services not appearing on the dashboard.
- `lib/catalog.js`: Removed Stripe and PagerDuty (their `/api/v2/summary.json` endpoints return 404 — no public Atlassian API). Replaced with Twilio (`status.twilio.com`) and SendGrid (`status.sendgrid.com`), both verified to return valid JSON.
- `app/api/proxy/route.js`: Updated `ALLOWED_HOSTS` to match the corrected catalog URLs.
- `components/ServiceIcon.jsx`: Added `initials` prop as text fallback for services without a simple-icons SVG (Twilio, SendGrid).
- `components/ServiceCard.jsx` + `AddServiceModal.jsx`: Pass `initials={svc.initials}` to `ServiceIcon`.

---

# [2026-04-03]

## Changed
- `app/globals.css`: Replaced flat `#f5f5f3` background with a layered mesh gradient + 4 animated floating orbs (violet, indigo, emerald) that slowly drift using `orb-drift` keyframe animation. Added `wobble` keyframe and `.card-wobble` class — hover triggers a gentle rotation+scale animation with elevated shadow.
- `app/layout.js`: Added 4 fixed `.bg-orb` divs for the animated background blobs; wrapped children in a `z-index: 1` container so content sits above orbs.
- `components/ServiceCard.jsx`: Added `card-wobble` class to all three card variants (CompactServiceCard, IssueCard, default ServiceCard).

---

## Changed
- `app/page.js`: Dashboard now splits services into two columns — Operational (left, compact) and Active Issues (right, expanded with incident details). When all services are clear, shows a single grid with an all-clear banner. Removed `IssuesDropdown` from the dashboard view since incident details are now inline.
- `components/ServiceCard.jsx`: Added `CompactServiceCard` (horizontal, for operational column) and `IssueCard` (expanded with per-incident detail blocks including name, impact badge, status, time ago, and latest update text). Original `ServiceCard` default export retained.

## Fixed
- `lib/services.js`: Railway URL changed from `status.railway.app` (defunct JSON API) to `railway.app` with `isPing: true` — proxy now does a HEAD ping and returns synthetic status JSON instead of erroring
- `app/api/proxy/route.js`: Added `PING_HOSTS` list; for ping hosts, does a HEAD request and returns synthetic Atlassian-compatible status JSON based on HTTP response code; removed `status.railway.app` from allowed JSON hosts, added `railway.app` to ping list
- `lib/services.js`: `getIncidents` now falls back to degraded `components` when there are no formal incidents (fixes Cloudflare showing "Service is experiencing issues" with no details — now shows grouped component degradations with location names)

---

## Changed
- Replaced emailOTP + Resend authentication with admin-only user management via Better Auth admin plugin
- `lib/auth.js`: Removed emailOTP/Resend; added `admin()` plugin; disabled `requireEmailVerification`
- `lib/auth-client.js`: Replaced `emailOTPClient` with `adminClient`
- `proxy.js`: Removed `/register` and `/verify-email` from public paths; only `/login` and `/api/auth` are public
- `app/(auth)/login/page.js`: Simplified to pure email+password sign-in with no OTP redirect
- `prisma/schema.prisma`: Added `impersonatedBy String?` to Session model for admin plugin

## Added
- `app/admin/page.js`: Server-side protected admin page (requires `role === 'admin'`)
- `app/admin/AdminPanel.js`: Client UI for listing, creating, and removing users via `authClient.admin.*`
- `scripts/create-admin.mjs`: One-time seed script to bootstrap the initial admin user
- Migration `20260403174917_add_admin_fields`: Adds `impersonatedBy` column to Session table

## Removed
- `app/(auth)/register/page.js`: Public self-registration removed; only admin can create users
- `app/(auth)/verify-email/page.js`: Email OTP verification removed entirely
