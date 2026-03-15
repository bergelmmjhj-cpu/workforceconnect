# Workforce Connect

## Overview
Workforce Connect is a cross-platform mobile and web application designed to optimize workforce management for Clients, Workers, and HR teams. It facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to improve efficiency, ensure compliance, and provide role-based access with multi-timezone support. The project's vision is to become a leading solution in workforce management, enhancing operational effectiveness and user experience for all stakeholders.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React Native (Expo) application supporting iOS, Android, and Web. It uses React Navigation for role-adaptive navigation, TanStack Query for server state, and React Context for authentication. UI components are custom-themed, support light/dark modes, and employ React Native Reanimated for animations. A multi-stage onboarding process is implemented for workers. GPS-based time tracking (TITO) uses `react-native-maps` for geofenced location verification (100-meter radius using Haversine formula). Two-Factor Authentication (2FA) is integrated. The web version features persistent, authenticated, and role-gated sidebar navigation, with responsive content width constraints.

### Backend
The backend is an Express.js application built with TypeScript, offering RESTful API endpoints. It utilizes PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also hosts a marketing landing page. Authentication uses bcrypt for password hashing and implements role-based access control (admin, hr, client, worker).

Key features include:
- **Internal Messaging System**: Real-time polling for communication.
- **Workplace Management**: Admins manage locations, assign workers, and view TITO logs.
- **Timesheets & Payroll**: Supports bi-weekly pay periods with admin review, approval, and CSV export. TITO operations are idempotent with server-side calculations and audit logging.
- **TITO System**: Server-side validation for shift durations, active sessions, and shift boundaries. Includes accident recovery mechanisms (cancellation, correction requests).
- **User Management**: Admins can perform CRUD operations on users, manage roles, and toggle user status.
- **Shift Request Management**: Workflow for creating, accepting/declining shifts with fill-to-capacity logic, smart-assignment, broadcast capabilities, and history tracking.
- **Automated Notifications**: Push and in-app notifications for various operational events.
- **Shift Series Model**: Defines and expands recurring shifts.
- **Multi-mode Roster View**: Daily, weekly, bi-weekly, monthly, and semi-monthly views of shifts.
- **Profile Management**: Users can edit their own profile details; admins can manage profile photos and edit phone numbers.
- **Two-Factor Authentication**: Backend APIs for TOTP setup, verification, disabling, and recovery codes.
- **Application-to-Account Bridge**: Automates user account creation for approved worker applications, sending temporary credentials via SMS.
- **Auth Improvements**: Manages pending accounts, admin-driven account activation/creation emails, password reset flow, and admin invite functionality for HR/Client roles, including force password change on first login.
- **Bulk SMS**: Admins can send app download/login instructions to workers via SMS.
- **Consolidated Email Timesheet**: Allows admins/HR to email filtered timesheet CSVs.
- **AI Operations Assistant**: An embedded background monitor checking various operational signals and triggering alerts or actions.
- **Clawd AI — Multi-Agent Business Intelligence**: A multi-agent orchestration system providing structured insights and responses based on user queries, utilizing Anthropic's Claude. The frontend provides a 4-tab workspace.
- **GM Lilee SMS Notifications**: Sends SMS alerts to a specific GM phone number for critical operational events and automated daily/weekly deployment reports.
- **Director Appointments System**: A standalone system for tracking lead-generation appointments, including CRUD API, admin-only frontend, and integration with a CRM.
- **Clawd AI Action Tools**: Agentic loop via Anthropic Claude with 20 tools (10 lookup + 10 action). Includes SMS classification for intents like sick calls and client requests, triggering smart auto-responses. Lookup tools: workers, shifts, workplaces, shift requests, SMS logs, Discord alerts, available workers, Discord members, list calendar events, read recent Gmail emails. Action tools: send SMS, notify GM Lilee, send Discord, internal message, create shift request, create workplace (with auto-geocoding), update workplace, generate Replit prompt, create Google Calendar event, send Gmail email.
- **Clawd AI SMS Intelligence Engine**: Structured SMS classification pipeline with 6 intent categories and entity extraction. Features a fail-open design for unknown senders and full audit logging.
- **Clawd AI Chat Continuity**: Sticky action mode for continuous conversations, pending shift draft state persistence, fuzzy worker name lookup, and phone-number lookup.
- **Two-Way Discord Integration**: Outbound alerts via webhook and inbound command processing via Discord bot. Supports natural language and slash commands, `@mention` Oscar for free-form queries, and logs all actions with an audit trail.
- **Toronto Timezone Utility**: Provides `nowToronto()`, `toToronto()`, `formatToronto()` for consistent timezone handling.
- **AI Follow-Up SMS Service**: Logs AI-sent SMS messages and sends human-like follow-ups after 2 hours if no reply, cancelled upon recipient response.
- **Applicant Portal**: Public form and admin screen for managing job applications, including status management and document downloads.
- **Applicants Admin Web Portal**: Password-protected HTML page for admin/HR to manage applicants with stats, searchable table, and document downloads.
- **System Settings UI**: Admin screen to configure app-wide settings (e.g., Discord webhook URL).
- **Clawd AI Web Chat (PWA)**: Standalone, session-authenticated HTML page for admin/HR, offering full markdown rendering and PWA installability.
- **CRM Timezone Fix**: `crmToLocal()` in `server/services/crm-sync.ts` correctly handles CRM ISO date strings without erroneous timezone conversion.
- **Consolidated Lilee Shift Reminder SMS**: Sends one consolidated report SMS to GM Lilee for all newly-reminded workers, preventing individual CC texts.
- **GPT-4o Vision Integration**: Image analysis in Clawd AI via GPT-4o Vision model. Supports image uploads in the app (base64), Discord image attachments (URLs), and SMS image analysis. Images are pre-processed into text descriptions that augment the user's message before orchestration.

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

### Cloud Services & APIs
- **OpenPhone API**: For sending and receiving SMS messages.
- **Anthropic API**: Integrated for Clawd AI's large language model capabilities (Claude-Sonnet-4-6).
- **OpenAI API (GPT-4o)**: Used for vision/image analysis in Clawd AI via Replit AI integrations.
- **SendGrid**: Used for sending emails.
- **Google Places API**: For location-based services.

### Third-Party Integrations
- **Weekdays CRM**: Custom integration for two-way syncing workplaces, shifts, and hotel requests. Workplace create/update via Oscar pushes to CRM automatically. Backfill runs on startup for unlinked workplaces. Admin route: `POST /api/admin/workplaces/sync-to-crm`.

### Development & Deployment Tools
- **TypeScript**: Used for type-safe code.
- **ESLint + Prettier**: For code quality and formatting.
- **esbuild**: For server bundling.
- **EAS Build**: Expo Application Services for building and deploying mobile apps.