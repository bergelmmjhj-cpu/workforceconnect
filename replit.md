# Workforce Connect

## Overview

Workforce Connect is a cross-platform mobile and web application designed to optimize workforce management for Clients, Workers, and HR teams. It facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to improve efficiency, ensure compliance, and provide role-based access with multi-timezone support, including a business website for marketing and lead generation. The project's vision is to become a leading solution in workforce management, enhancing operational effectiveness and user experience for all stakeholders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is a React Native (Expo) application supporting iOS, Android, and Web. It uses React Navigation for role-adaptive navigation, TanStack Query for server state, and React Context for authentication. UI components are custom-themed, support light/dark modes, and employ React Native Reanimated for animations. A multi-stage onboarding process is implemented for workers. GPS-based time tracking (TITO) uses `react-native-maps` for geofenced location verification (100-meter radius using Haversine formula). Two-Factor Authentication (2FA) is integrated. The web version features a persistent, authenticated, and role-gated sidebar navigation on wide screens, with responsive content width constraints applied across various screen types to prevent stretching.

### Backend

The backend is an Express.js application built with TypeScript, offering RESTful API endpoints. It utilizes PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also hosts a marketing landing page. Authentication uses bcrypt for password hashing and implements role-based access control (admin, hr, client, worker).

Key features include:
- **Internal Messaging System**: Real-time polling for communication.
- **Workplace Management**: Admins manage locations, assign workers, and view TITO logs.
- **Timesheets & Payroll**: Supports bi-weekly pay periods with admin review, approval, and CSV export. TITO operations are idempotent with server-side calculations and audit logging.
- **TITO System**: Server-side validation for shift durations, active sessions, and shift boundaries. Includes accident recovery mechanisms (cancellation, correction requests), and a comprehensive filter bar with compact, expandable cards.
- **User Management**: Admins can perform CRUD operations on users, manage roles, and toggle user status.
- **Shift Request Management**: Workflow for creating, accepting/declining shifts with fill-to-capacity logic, smart-assignment, broadcast capabilities, and history tracking.
- **Automated Notifications**: Push and in-app notifications for various operational events (shift offers, reminders, late clock-ins, etc.).
- **Shift Series Model**: Defines and expands recurring shifts.
- **Multi-mode Roster View**: Daily, weekly, bi-weekly, monthly, and semi-monthly views of shifts.
- **Profile Photo Requirement**: Upload and admin review workflow for user profile photos.
- **Profile Editing**: Users can edit their own profile details; admins can edit any user's phone number.
- **Two-Factor Authentication**: Backend APIs for TOTP setup, verification, disabling, and recovery codes.
- **Application-to-Account Bridge**: Automates user account creation for approved worker applications, sending temporary credentials via SMS.
- **Auth Improvements**: Manages pending accounts, admin-driven account activation/creation emails, password reset flow, and admin invite functionality for HR/Client roles.
- **Force Password Change**: Requires users to change a temporary password upon first login.
- **Bulk SMS**: Admins can send app download/login instructions to workers via SMS.
- **Consolidated Email Timesheet**: Allows admins/HR to email filtered timesheet CSVs.
- **AI Operations Assistant**: An embedded background monitor that runs every 5 minutes, checking 5 signal types (e.g., new leads, unacknowledged shift requests, urgent unfilled shifts, pending accounts digest) and triggering alerts or actions. It maintains an audit trail and prevents duplicate alerts.
- **Clawd AI — Multi-Agent Business Intelligence**: A multi-agent orchestration system for admin/HR users. It comprises 6 specialized assistants and 5 analytics services, coordinated by an Executive Orchestrator, to provide structured insights and responses based on user queries, utilizing Anthropic's Claude. The frontend provides a 4-tab workspace for interaction.
- **GM Lilee SMS Notifications**: Sends SMS alerts to a specific GM phone number for critical operational events and automated daily/weekly deployment reports.
- **Director Appointments System**: A standalone system for tracking lead-generation appointments, including CRUD API, admin-only frontend, and integration with a CRM.
- **Clawd AI Action Tools**: Tool-use (agentic loop) via Anthropic Claude. 13 tools: 7 lookup (workers, shifts, workplaces, shift requests, SMS logs, Discord alerts, available workers) + 6 action (send SMS, notify GM Lilee, send Discord, internal message, blast shift, generate Replit prompt). SMS classification detects sick calls and client requests and triggers smart auto-responses with audit trail.
- **Two-Way Discord Integration**: Outbound alerts via webhook (stored in DB `app_config`, configurable via System Settings UI). Inbound ACK via `POST /api/webhooks/discord`. Full `discord_alerts` table with status tracking and in-app acknowledgment buttons.
- **Toronto Timezone Utility**: `server/utils/time.ts` provides `nowToronto()`, `toToronto()`, `formatToronto()` using `date-fns-tz`.
- **AI Follow-Up SMS Service**: `server/services/aiFollowupService.ts` logs AI-sent SMS messages and sends human-like follow-ups after 2 hours if no reply. Cancelled automatically when recipient responds. Scheduler runs every 15 minutes.
- **Applicant Portal**: Public form at `apply.wfconnect.org` and `/apply`. Applicants submit name, Canadian address (Google Places autocomplete), phone, position, job source, photo, and resume. Files stored as base64. Admin screen shows all applicants with status management (new/reviewing/interviewed/hired/rejected) and one-click download for photo and resume.
- **Applicants Admin Web Portal**: Standalone HTML page at `apply.wfconnect.org/applicants` (route: `/applicants`). Password-protected login for admin/HR. Features: stats dashboard, searchable/filterable table, slide-in detail panel, status management, document downloads. Auth verified server-side via `GET /api/auth/verify` on every page load. XSS-protected with `esc()`/`escAttr()` escaping. Served on apply subdomain, localhost, and Replit dev domains.
- **Auth Verification Endpoint**: `GET /api/auth/verify` validates user ID and role from headers against the database, checking that the user exists and is active. Used by the applicants web portal for server-side auth validation on page load.
- **System Settings UI**: Admin screen to configure app-wide settings (Discord webhook URL) stored in `app_config` DB table with test button and setup instructions.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **Drizzle ORM**: Type-safe object-relational mapper for PostgreSQL.

### Frontend Libraries
- **Expo SDK**: Framework for cross-platform app development.
- **React Navigation**: For managing navigation flows.
- **TanStack Query**: For data fetching, caching, and synchronization.
- **date-fns/date-fns-tz**: Libraries for date manipulation and timezone handling.
- **react-native-maps**: For displaying maps and location-based features.
- **react-native-qrcode-svg**: For generating QR codes.

### Cloud Services & APIs
- **OpenPhone API**: For sending and receiving SMS messages, including shift offer blasts and replies.
- **Anthropic API**: Integrated for Clawd AI's large language model capabilities (Claude-Sonnet-4-6).
- **SendGrid**: Used for sending emails, such as timesheet CSVs.
- **Google Places API**: For location-based services (not explicitly detailed in usage but listed in env vars).

### Third-Party Integrations
- **Weekdays CRM**: Custom integration for syncing workplaces, shifts, and hotel requests, providing a pull-only sync engine with audit logging and admin UI for control.

### Development & Deployment Tools
- **TypeScript**: Used for type-safe code.
- **ESLint + Prettier**: For code quality and formatting.
- **esbuild**: For server bundling.
- **EAS Build**: Expo Application Services for building and deploying mobile apps.

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
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`