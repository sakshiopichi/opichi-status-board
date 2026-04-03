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
