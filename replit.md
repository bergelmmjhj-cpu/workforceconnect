# Workforce Connect

## Overview

Workforce Connect is a cross-platform mobile application and web platform designed to streamline workforce management for Clients, Workers, and HR teams. It facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to enhance efficiency, ensure compliance, and provide role-based access with multi-timezone support, including a business website for marketing and lead generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is a React Native (Expo) application for iOS, Android, and Web, utilizing React Navigation for role-adaptive navigation. State management relies on TanStack Query for server state and React Context for authentication, with AsyncStorage for local persistence. UI components are custom-themed, support light/dark modes, and use React Native Reanimated for animations. A multi-stage onboarding process is implemented for workers, including application, subcontractor notice, and agreement signing. GPS-based time tracking (TITO) uses `react-native-maps` and verifies worker location within a 100-meter geofence using the Haversine formula. Two-Factor Authentication (2FA) is implemented with setup and verification UIs.

### Backend

The backend is an Express.js application built with TypeScript, exposing RESTful API endpoints prefixed with `/api`. It uses PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also serves a marketing landing page with SEO optimization and a public contractor payment guide. Authentication uses bcrypt for password hashing and supports role-based access (admin, hr, client, worker).

Key features include:
- **Internal Messaging System**: Real-time polling for HR/Admin to worker communication.
- **Workplace Management**: Admins manage locations, assign workers, and view TITO logs.
- **Timesheets & Payroll**: Supports bi-weekly pay periods, with an admin portal for review/approval and CSV export. TITO operations are idempotent, server-side calculations of hours, and comprehensive audit logging.
- **User Management**: Admins can CRUD users, manage roles, and toggle status.
- **Shift Request Management**: Full workflow from client/admin creation to worker acceptance/decline with fill-to-capacity logic (multiple workers per shift via `workersNeeded`). Includes smart-assignment, broadcast/blast capabilities, and first-available acceptance. Shift offers maintain a full history with soft-delete for cancellations.
- **Automated Notifications**: Push and in-app notifications for shift offers, reminders, late clock-ins, unusual hours, flagged clock-outs, and new shift requests.
- **Shift Series Model**: Allows for defining recurring shifts with on-the-fly occurrence expansion.
- **Multi-mode Roster View**: Provides daily, weekly, bi-weekly, monthly, and semi-monthly views of shifts and series.
- **Profile Photo Requirement**: Upload endpoint with admin review workflow. Photos display across the app (profile, directory, shift cards) via `profilePhotoUrl` on users. WebSocket events invalidate caches on approval.
- **Profile Editing**: Users can edit their own name, email, phone, timezone via `PATCH /api/users/me/profile`. Clients can also edit business fields. Admins can edit any user's phone number via User Management.
- **Two-Factor Authentication**: Backend API for setup, verification, disabling, and status checks, supporting TOTP and recovery codes.

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

### Environment Variables
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN`
- `DEMO_MODE`
- `GOOGLE_PLACES_API_KEY`
- `SESSION_SECRET`
- `OPENPHONE_API_KEY`