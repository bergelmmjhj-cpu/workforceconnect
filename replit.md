# Workforce Connect

## Overview

Workforce Connect is a cross-platform mobile application and web platform designed to streamline workforce management for Clients, Workers, and HR teams. Built with React Native (Expo) and an Express.js backend, it facilitates staff deployment, GPS-verified time tracking (TITO), and real-time communication. The platform aims to enhance efficiency, ensure compliance (GDPR, Canadian privacy), and provide role-based access with multi-timezone support. It includes a business website for marketing and lead generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is a React Native (Expo SDK 54) application targeting iOS, Android, and Web. It uses React Navigation v7 for navigation, featuring role-adaptive tab navigators. State management is handled by TanStack Query for server state and React Context for authentication, with AsyncStorage for local persistence. UI components are custom-themed, adapting to light/dark modes, and animations utilize React Native Reanimated. A 5-slide onboarding experience guides first-time users, and workers undergo a multi-stage onboarding process with an application form, subcontractor notice, and agreement signing (v2.0). GPS-based time tracking (TITO) uses `react-native-maps` and verifies worker location within a 100-meter geofence using the Haversine formula.

### Backend

The backend is an Express.js application built with TypeScript, exposing RESTful API endpoints prefixed with `/api`. It uses PostgreSQL with Drizzle ORM for type-safe database interactions. The backend also serves a comprehensive marketing landing page with a contact form, rate limiting, SEO optimization (meta tags, sitemap.xml, robots.txt), and a public contractor payment guide at `/guide`. Authentication uses bcrypt for password hashing and supports role-based access (admin, hr, client, worker). An internal messaging system allows HR/Admin to communicate with workers, featuring real-time polling and dedicated API endpoints for managing conversations and messages. Workplace management features allow admins to manage work locations, assign workers, and view TITO logs. Timesheets & Payroll system supports 26 bi-weekly pay periods per year (2026 starts Dec 27, 2025), with admin web portal at `/admin/timesheets` for reviewing/approving timesheets and managing payroll batches with CSV export.

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

## App Store Links

- **iOS App Store**: https://apps.apple.com/app/workforceconnect/id6758402360