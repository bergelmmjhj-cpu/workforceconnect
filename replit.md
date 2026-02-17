# Workforce Connect

## Overview

Workforce Connect is a cross-platform mobile application and web platform designed to streamline workforce management for Clients, Workers, and HR teams. Built with React Native (Expo) and an Express.js backend, it facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to enhance efficiency, ensure compliance (GDPR, Canadian privacy), and provide role-based access with multi-timezone support. It includes a business website for marketing and lead generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is a React Native (Expo SDK 54) application targeting iOS, Android, and Web. It uses React Navigation v7 for navigation, featuring role-adaptive tab navigators. State management is handled by TanStack Query for server state and React Context for authentication, with AsyncStorage for local persistence. UI components are custom-themed, adapting to light/dark modes, and animations utilize React Native Reanimated. A 5-slide onboarding experience guides first-time users, and workers undergo a multi-stage onboarding process with an application form, subcontractor notice, and agreement signing (v2.0). GPS-based time tracking (TITO) uses `react-native-maps` and verifies worker location within a 100-meter geofence using the Haversine formula.

### Backend

The backend is an Express.js application built with TypeScript, exposing RESTful API endpoints prefixed with `/api`. It uses PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also serves a comprehensive marketing landing page with a contact form, rate limiting, SEO optimization (meta tags, sitemap.xml, robots.txt), and a public contractor payment guide at `/guide`. Authentication uses bcrypt for password hashing and supports role-based access (admin, hr, client, worker). An internal messaging system allows HR/Admin to communicate with workers, featuring real-time polling and dedicated API endpoints for managing conversations and messages. Workplace management features allow admins to manage work locations, assign workers, and view TITO logs. Timesheets & Payroll system supports 26 bi-weekly pay periods per year (2026 starts Dec 27, 2025), with admin web portal at `/admin/timesheets` for reviewing/approving timesheets and managing payroll batches with CSV export. User Management allows admins to view all users, create new users with any role, edit user roles, toggle active/inactive status, and delete users via dedicated API endpoints (GET/POST/PATCH/DELETE /api/users). Shift Request Management supports the full workflow: clients/admins create shift requests, HR/admin can smart-assign to specific workers or broadcast to all eligible workers, workers receive in-app notifications and accept/decline offers (first-accept-wins), and the system auto-assigns the accepting worker while cancelling other offers. Database tables: shift_requests, shift_offers, app_notifications, shift_checkins, sent_reminders. API endpoints: /api/shift-requests (CRUD + assign + eligible-workers + offers), /api/shift-offers (list + respond), /api/notifications (list + read + read-all), /api/shifts/:id/checkin.

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

### Development Tools
- **TypeScript**: For type safety.
- **ESLint + Prettier**: Code quality and formatting.
- **esbuild**: Server bundling.

### Environment Variables
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN`
- `DEMO_MODE` - Set to "false" for production mode (disables demo data seeding and demo UI)
- `GOOGLE_PLACES_API_KEY` - Google Places API for address autocomplete
- `SESSION_SECRET` - Session secret for authentication

## Production Mode

The application runs in **production mode** with `DEMO_MODE=false`:

- **No demo data seeding**: Server skips creating sample users, workplaces, and timesheets
- **No demo login UI**: Login screen shows only email/password fields, no role selector
- **No demo fallback authentication**: Login requires valid database credentials
- **No role switching**: ProfileScreen does not include demo role switching functionality
- **All users must register**: Use the Sign Up flow to create new accounts

### Creating Initial Admin User

To create an initial admin user, use the admin user creation endpoint or insert directly into the database:

```sql
INSERT INTO users (id, email, password, role, first_name, last_name)
VALUES (gen_random_uuid(), 'admin@wfconnect.org', '<bcrypt_hash>', 'admin', 'Admin', 'User');
```

## Recent Changes (Feb 17, 2026)

### Phase 2 Bug Fixes & Features
- **Timezone Fix**: /api/my-today and /api/shifts now use `America/Toronto` timezone for "today" calculation instead of UTC. Prevents showing tomorrow's shifts as today during evening hours.
- **Cache Invalidation Fix**: WorkplaceDetailScreen shift create/delete/series-delete mutations now invalidate the correct workplace-specific query key (`/api/shifts?workplaceId=X`) plus `/api/my-today`.
- **Delete Workplace**: Admin-only DELETE /api/workplaces/:id endpoint with full cascade cleanup (shifts, shift_offers, shift_checkins, sent_reminders, shift_series, shift_requests, workplace_assignments, tito_logs). Timesheet entries and export audit logs have workplaceId nulled rather than deleted. UI: trash icon in WorkplaceDetailScreen header with confirmation modal.
- **Alert.alert Elimination**: Replaced all 19 remaining Alert.alert calls across 6 screens (WorkplaceDetailScreen, WorkplaceEditScreen, WorkplacesListScreen, WorkerApplicationFormScreen, AgreementSigningScreen, AssignToWorkplaceScreen) with custom Modal-based dialogs. Alert.alert can fail silently on React Native mobile.

### Phase 2: Two-Factor Authentication (6 tasks completed)
- **2FA Database Schema**: Added totpSecret, totpEnabled, recoveryCodes columns to users table.
- **2FA Backend API**: OTPAuth library for TOTP. Endpoints: POST /api/2fa/setup (generate secret+URI), POST /api/2fa/verify-setup (verify code, enable 2FA, return recovery codes), POST /api/2fa/disable (verify code, disable 2FA), POST /api/2fa/verify (login verification, supports TOTP + single-use recovery codes), GET /api/2fa/status (check if enabled).
- **2FA Login Flow**: Login endpoint returns { requires2FA: true, userId } when user has 2FA enabled. Client navigates to TwoFactorVerifyScreen for code entry. AuthContext has complete2FALogin() method.
- **2FA Setup UI**: ProfileScreen Security section with shield icon, "Two-Factor Authentication" menu item showing enabled/disabled status. Modal flow: intro -> QR code scan (react-native-qrcode-svg) -> verify code -> display 8 recovery codes.
- **2FA Login Screen**: TwoFactorVerifyScreen with 6-digit code input (large centered digits), toggle for recovery code mode, back to sign in link. Supports both TOTP codes and recovery codes.
- **Recovery Codes**: 8 random uppercase hex codes, single-use, stored as JSON. Warning when < 3 remaining.

### Phase 1 Platform Upgrade (11 tasks completed)
- **Shift Series Model**: shift_series table with on-the-fly occurrence expansion. POST /api/shifts creates series instead of pre-generating rows. Series cards UI in WorkplaceDetailScreen.
- **Multi-mode Roster View**: RosterScreen with Daily/Weekly/Bi-weekly/Monthly/Semi-monthly tabs, date navigation, unified shift/series display via GET /api/roster.
- **Push Notifications**: Expo Push API integrated. Client-side token registration via POST /api/push-token. Push notifications sent on shift offers, shift acceptance, and other events.
- **Automated Reminders**: Server-side scheduler runs every 15 minutes, sends push + in-app notifications for day-before and day-of shift reminders. Uses sent_reminders table to prevent duplicates.
- **My Today Dashboard**: GET /api/my-today endpoint shows today's shifts, pending offers, unfilled shifts. Role-specific DashboardScreen sections.
- **Notifications Inbox**: NotificationsScreen with in-app notification center, mark-as-read, mark-all-read.
- **Profile Photo Requirement**: POST /api/profile-photo upload endpoint, admin review workflow (approve/reject), photo upload UI in ProfileScreen with camera/gallery picker, status badges. profilePhotoUrl column added to users table.
- **Smart Assign Polish**: Decline confirmation modal (custom Modal, not Alert.alert), 30-second auto-refresh polling for shift offers, cache invalidation for notifications/my-today after accept/decline.
- **Safe Trial Reset**: POST /api/trial-reset/dry-run and /execute endpoints. Admin Settings danger zone UI in ProfileScreen.

### Previous Changes (Feb 16, 2026)
- **Cascade Deletion**: DELETE /api/shifts/:id now properly deletes related shift_offers, shift_checkins, and child recurring shifts before deleting the parent.
- **Eligible Workers API**: GET /api/shift-requests/:id/eligible-workers returns both old and new format for frontend compatibility.
- **Past Shift Filtering**: GET /api/shifts excludes past completed/cancelled shifts by default. Use ?includePast=true for history.
- **Custom Modals**: Replaced Alert.alert with custom Modal components throughout (Alert.alert can fail silently on mobile).

## App Store Links

- **iOS App Store**: https://apps.apple.com/app/workforceconnect/id6758402360