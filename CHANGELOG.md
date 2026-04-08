# [2026-04-08]

## Changed
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
