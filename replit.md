# Workforce Connect

## Overview

Workforce Connect is a cross-platform mobile application and web platform designed to streamline workforce management for Clients, Workers, and HR teams. It facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to enhance efficiency, ensure compliance, and provide role-based access with multi-timezone support, including a business website for marketing and lead generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is a React Native (Expo) application for iOS, Android, and Web, utilizing React Navigation for role-adaptive navigation. State management relies on TanStack Query for server state and React Context for authentication, with AsyncStorage for local persistence. UI components are custom-themed, support light/dark modes, and use React Native Reanimated for animations. A multi-stage onboarding process is implemented for workers, including application, subcontractor notice, and agreement signing. GPS-based time tracking (TITO) uses `react-native-maps` and verifies worker location within a 100-meter geofence using the Haversine formula. Two-Factor Authentication (2FA) is implemented with setup and verification UIs.

**Web Sidebar Layout**: On wide web screens (>768px), a persistent 220px sidebar (`WebSidebarLayout.tsx`) wraps the entire navigation tree in `App.tsx`, providing role-based navigation that persists across both tab and stack screens. The bottom tab bar is hidden on wide web via `display: "none"`. The sidebar is gated behind authentication, onboarding completion, and password change status. `useIsWideWeb()` and `useContentPadding()` hooks handle responsive padding differences between mobile and web.

### Backend

The backend is an Express.js application built with TypeScript, exposing RESTful API endpoints prefixed with `/api`. It uses PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also serves a marketing landing page with SEO optimization and a public contractor payment guide. Authentication uses bcrypt for password hashing and supports role-based access (admin, hr, client, worker).

Key features include:
- **Internal Messaging System**: Real-time polling for HR/Admin to worker communication.
- **Workplace Management**: Admins manage locations, assign workers, and view TITO logs. Workplace detail screens filter assignments to active/invited status only (inactive assignments excluded from worker count and list).
- **Timesheets & Payroll**: Supports bi-weekly pay periods, with an admin portal for review/approval and CSV export. TITO operations are idempotent, server-side calculations of hours, and comprehensive audit logging. Mobile "Email Timesheet" button for admin/HR to send CSV via SendGrid.
- **TITO System (Stabilized)**:
  - Consolidated screens: `TitoLogsList.tsx` shared component used by both Tito tab and Management > TITO Logs (removed dead placeholder).
  - Server-side validation: minimum 60s shift duration, single active session across all workplaces, rate limiting (10 req/min per user).
  - Strict shift-bound validation: clock-in only within [shiftStart - 15min, shiftEnd + 30min], clock-out within [shiftStart, shiftEnd + 30min]. `shiftId` required on all clock-ins.
  - Accident recovery: cancel clock-in within 2 minutes, correction requests (`tito_corrections` table) with admin approval workflow, "Adjusted" badge on corrected records.
  - Client-side: 2-second debounce on clock-in/out buttons, cancel button visible for 2 minutes after clock-in, network error handling.
  - Filter bar: proper `stickyHeaderIndices` (replaced position: absolute hack). Compact collapsible TitoCards (name/date/times/status in one row; details expand on tap). No phone/call/SMS action buttons on TitoCards — only Approve/Dispute for pending items.
  - Status values: pending, approved, disputed, canceled, flagged. Canceled records excluded from payroll but visible in admin.
- **User Management**: Admins can CRUD users, manage roles, and toggle status.
- **Shift Request Management**: Full workflow from client/admin creation to worker acceptance/decline with fill-to-capacity logic (multiple workers per shift via `workersNeeded`). Includes smart-assignment, broadcast/blast capabilities, and first-available acceptance. Shift offers maintain a full history with soft-delete for cancellations.
- **Automated Notifications**: Push and in-app notifications for shift offers, reminders, late clock-ins, unusual hours, flagged clock-outs, and new shift requests.
- **Shift Series Model**: Allows for defining recurring shifts with on-the-fly occurrence expansion.
- **Multi-mode Roster View**: Provides daily, weekly, bi-weekly, monthly, and semi-monthly views of shifts and series.
- **Profile Photo Requirement**: Upload endpoint with admin review workflow. Photos display across the app (profile, directory, shift cards) via `profilePhotoUrl` on users. WebSocket events invalidate caches on approval.
- **Profile Editing**: Users can edit their own name, email, phone, timezone via `PATCH /api/users/me/profile`. Clients can also edit business fields. Admins can edit any user's phone number via User Management.
- **Two-Factor Authentication**: Backend API for setup, verification, disabling, and status checks, supporting TOTP and recovery codes.
- **Application-to-Account Bridge**: Approving a worker application auto-creates a user account with temporary password (`firstName + last4Phone`), `mustChangePassword: true`, and sends welcome SMS with login credentials via OpenPhone. A startup backfill routine catches previously approved applications without accounts.
- **Auth Improvements**: Pending accounts (email/password login) return `{pending:true}` and show an info banner instead of an error. Admin activating an account sends an approval email. Admin creating a user sends a welcome email. Forgot Password flow with 1-hour token via email and a ResetPasswordScreen. Sign-up supports Worker/Client role toggle with optional Business Name. Admin invite flow (`POST /api/admin/invite-user`) creates HR/Client accounts, generates temp passwords, and emails credentials. User Management screen accessible from Management Hub with "Invite HR/Client" FAB and modal.
- **Force Password Change**: `mustChangePassword` boolean on `users` table. Login returns the flag; `ChangePasswordScreen` blocks app access until password is changed via `POST /api/auth/change-password`.
- **Bulk SMS**: `POST /api/admin/send-app-instructions` sends app download/login SMS to all workers with phone numbers, skipping those already notified. Admin dashboard has a "Send App Instructions" button.
- **Consolidated Email Timesheet**: `POST /api/tito/email-timesheet` accepts `period` (weekly/biweekly/monthly), `workplaceId`, `workerId` filters. CSV includes per-worker totals and grand total. Mobile modal has period chips, workplace/worker selectors.
- **AI Operations Assistant**: Embedded background monitor in the Express server that runs every 5 minutes. Monitors 5 signal types: (1) new contact form leads (immediate email to admin), (2) shift requests unacknowledged 30 min (reminder), (3) shift requests unacknowledged 4h (escalation), (4) scheduled shifts with no worker within 4 hours (urgent), (5) daily 9 AM pending accounts digest. Uses `ai_action_logs` table for audit trail and `ai_alert_state` table for deduplication. Activation timestamp prevents alerting on historical data. Admin screen `AiAssistantScreen.tsx` accessible via Management Hub with status, controls (run/pause/resume), rules legend, and scrollable action log. API routes: `GET /api/admin/ai-assistant/status`, `GET /api/admin/ai-assistant/logs`, `POST /api/admin/ai-assistant/trigger|pause|resume`.

### Data Flow

Client requests, managed by TanStack Query, are processed by the Express server and interact with PostgreSQL via Drizzle ORM.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe database toolkit.

### Frontend Libraries
- **Expo SDK**: Managed workflow for cross-platform development.
- **React Navigation**: Navigation framework.
- **TanStack Query**: Server state management.
- **date-fns/date-fns-tz**: Date and timezone utilities.
- **react-native-maps**: Map display for location features.
- **react-native-qrcode-svg**: For displaying QR codes.

### Development Tools
- **TypeScript**: For type safety.
- **ESLint + Prettier**: Code quality and formatting.
- **esbuild**: Server bundling.

### Deployment & OTA Updates
- **Static Expo Bundles**: Built via `scripts/build.js`, served from `static-build/` directory. Includes iOS/Android manifests and JS bundles.
- **OTA Updates**: Configured in `app.json` with `updates.url` pointing to `https://wfconnect.org/manifest`. Native builds check for JS bundle updates on launch.
- **EAS Build**: `eas.json` includes `EXPO_PUBLIC_DOMAIN=wfconnect.org` for production builds. Android `versionCode` must be incremented for each Play Store submission.
- **API URL Fallback**: `getApiUrl()` in `client/lib/query-client.ts` falls back to `wfconnect.org` if `EXPO_PUBLIC_DOMAIN` is not set, and strips dev port `:5000`.
- **Build sanitization**: `scripts/build.js` post-processes bundles to strip `:5000` port from API URLs to prevent dev port leaking into production.

### OpenPhone (Quo) SMS Integration
- **Service Module**: `server/services/openphone.ts` handles all SMS sending/logging via the OpenPhone API.
- **Webhook**: `POST /api/webhooks/openphone` receives incoming SMS replies from workers to accept/decline shift offers.
- **Phone Number IDs**: HR Number `PNo1n737XV` (+1 289-670-5697), HR Department `PNCQJAOZa0` (+1 437-476-9566). HR Number is used as the sender.
- **SMS Logs**: `sms_logs` table tracks all outbound and inbound SMS with direction, status, and linked shift/offer IDs.
- **Shift Blast SMS**: When shifts are blasted or broadcast, workers with phone numbers receive SMS with shift details and YES/NO reply instructions.
- **SMS Reply Parsing**: Workers text ACCEPT SHIFT or ACCEPT to accept, DECLINE SHIFT or DECLINE to decline their most recent pending shift offer. The webhook ONLY auto-replies to these shift keywords — all other messages are silently logged without any auto-reply, allowing normal HR text conversations on the same number.
- **Phone Field**: `phone` column added to `users` table; populated from `worker_applications` when workers onboard. On startup, a backfill routine copies missing phone numbers from approved applications to existing worker accounts.

### Weekdays CRM Integration
- **Service Module**: `server/services/weekdays-crm.ts` — typed REST client for all CRM API calls with retry logic (3 attempts, exponential backoff).
- **Sync Service**: `server/services/crm-sync.ts` — pull-only sync engine with sync lock, dry-run mode, and audit logging.
- **CRM API**: `https://weekdays.wfconnect.org`, Bearer token auth via `WEEKDAYS_API_KEY`, team ID via `WEEKDAYS_TEAM_ID`.
- **Endpoints synced**: Workplaces, Confirmed Shifts, Hotel Requests.
- **Workplace sync**: Deduplicates by name+address, links via `crmExternalId`, deactivates stale CRM workplaces.
- **Shift sync**: Matches workers by phone number (quoContactPhoneSnapshot → user.phone), converts UTC → local timezone based on province, creates missing workplaces as needed.
- **Hotel request sync**: Maps to shift_requests, cancels deleted CRM requests, uses admin user as clientId.
- **Auto-sync**: On startup (full sync), then every 15 minutes (shifts + hotel requests only). Non-blocking on failure.
- **Admin UI**: `CrmSyncScreen.tsx` — connection status, sync controls (Sync All, Preview/Dry Run, per-category sync), sync history log.
- **Schema additions**: `crmExternalId`/`crmSource` on workplaces, `crmShiftId`/`crmSource` on shifts, `crmRequestId`/`crmSource` on shift_requests, `crm_sync_logs` table.
- **Admin API endpoints**: `POST /api/admin/sync/workplaces|shifts|hotel-requests|all` (with `?dryRun=true`), `GET /api/admin/sync/status`, `GET /api/admin/sync/logs`.

### Environment Variables
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN`
- `DEMO_MODE`
- `GOOGLE_PLACES_API_KEY`
- `SESSION_SECRET`
- `OPENPHONE_API_KEY`
- `WEEKDAYS_API_KEY`
- `WEEKDAYS_TEAM_ID`