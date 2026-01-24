# Workforce Connect

## Overview

Workforce Connect is an enterprise workforce management platform built as a cross-platform mobile application using React Native (Expo) with an Express backend. The platform connects Clients, Workers, and HR teams for shift deployment, time tracking (TITO - Time In/Time Out), and workflow coordination.

Key capabilities include:
- Staff deployment and shift tracking
- Geolocation-based time tracking (TITO) with 100-meter geofence verification
- GPS-verified clock in/out requiring workers to be at work site
- Real-time messaging between users
- Role-based dashboards with SLA monitoring
- Multi-timezone support (UTC storage, localized display)
- GDPR and Canadian privacy compliance considerations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54, targeting iOS, Android, and Web from a single codebase.

**Navigation**: React Navigation v7 with:
- Native stack navigator for screen transitions
- Bottom tab navigator for role-based main navigation
- Role-adaptive tab configurations (Client: 4 tabs, Worker: 4 tabs, HR: 5 tabs, Admin: 4 tabs)

**State Management**:
- TanStack Query (React Query) for server state and caching
- React Context for authentication state
- AsyncStorage for local persistence and offline data

**UI Component Pattern**: Custom themed components (`ThemedText`, `ThemedView`, `Card`, `Button`) that automatically adapt to light/dark mode using a centralized theme system in `client/constants/theme.ts`.

**Animation**: React Native Reanimated for smooth, performant animations on buttons, cards, and loading states.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful endpoints prefixed with `/api`. The server handles CORS for Replit domains and localhost development.

**Database**: PostgreSQL with Drizzle ORM for type-safe database operations. Schema defined in `shared/schema.ts` using Drizzle's pgTable definitions with Zod integration for validation.

**Current State**: The backend has minimal implementation - routes are registered but most data is currently mocked in client-side storage (`client/storage/index.ts`). The architecture is ready for full API implementation.

### Data Flow

1. Client makes requests via TanStack Query hooks
2. `apiRequest` helper in `client/lib/query-client.ts` handles fetch calls
3. Server processes requests through Express routes
4. Data stored in PostgreSQL via Drizzle ORM

### App Onboarding Flow

First-time users are shown a 5-slide onboarding experience explaining:
1. Welcome and app overview
2. Role-based experience explanation
3. Shift management features
4. Time In/Time Out (TITO) tracking
5. Messaging and communication

Onboarding status is persisted in AsyncStorage (`@workforce_connect_onboarding`).

### Worker Onboarding System

Workers must complete an onboarding process before accessing the main app:

**Onboarding States** (`WorkerOnboardingStatus`):
- `NOT_APPLIED`: New worker, hasn't submitted application
- `APPLICATION_SUBMITTED`: Application under review by HR/Admin
- `APPLICATION_APPROVED`: Application approved, ready for agreement
- `APPLICATION_REJECTED`: Application rejected
- `AGREEMENT_PENDING`: Needs to sign subcontractor agreement
- `AGREEMENT_ACCEPTED`: Agreement signed, onboarding complete
- `ONBOARDED`: Fully onboarded worker

**Onboarding Gate**: Workers with incomplete onboarding are redirected to `WorkerOnboardingScreen` instead of the main app. Only workers with `AGREEMENT_ACCEPTED` or `ONBOARDED` status can access shifts, TITO, and messaging.

**Worker Application Form** (`WorkerApplicationFormScreen`):
Multi-section collapsible form with 8 sections:
- A. Personal Details (name, phone, email, address)
- B. Work Eligibility (legal status, ID, background check consent)
- C. Role Interests (job roles, work type preference)
- D. Experience & Skills (years experience, summary)
- E. Availability (days, shift types, travel distance)
- F. Emergency Contact (required)
- G. Preferences (contact channels, pay expectations)
- H. Declarations (acknowledgments, electronic signature)

**Subcontractor Notice** (`SubcontractorNoticeScreen`):
- Important disclosure screen shown before the full agreement
- Covers work status (independent subcontractor, not employee)
- Explains pay cycle & release timing (client-dependent payment)
- Lists payment methods (Direct Deposit, E-Transfer, Cheque)
- Payment information requirements
- Two required acknowledgement checkboxes before proceeding

**Subcontractor Agreement v2.0** (`AgreementSigningScreen`):
- Displays versioned agreement template with 11 sections covering:
  - Subcontractor Status (Not Employment)
  - Scope of Services
  - Pay Structure & Payment Release (client-dependent)
  - No Guaranteed Payment Date
  - Payment Methods (EFT, E-Transfer, Cheque)
  - Payment Information Requirement
  - Timekeeping & Verification (TITO)
  - Confidentiality & Conduct
  - Termination
  - Governing Law (Ontario)
  - Electronic Acceptance
- Signature section requires:
  - "I Agree" checkbox
  - Full legal name typed signature
  - Initials for 5 key sections (A-E: Subcontractor Status, Pay Structure, TITO, Confidentiality, Termination)
  - Date

**Demo Users for Testing**:
- `worker_new@example.com` - NOT_APPLIED status
- `worker_submitted@example.com` - APPLICATION_SUBMITTED status
- `worker_pending@example.com` - AGREEMENT_PENDING status
- `worker@example.com` - ONBOARDED status (full access)

### GPS Time Tracking (TITO)

Workers can clock in/out using GPS verification:
- Shifts store work site coordinates (`locationCoordinates`) and geofence radius (default 100m)
- ClockInOutScreen verifies worker is within geofence before allowing clock in/out
- Uses Haversine formula for distance calculation (`client/utils/location.ts`)
- TitoLog records actual coordinates and distance at clock in/out time
- Location permission flow with fallback to Settings on native devices
- Web shows notice directing users to Expo Go for full GPS features

### Authentication Pattern

Currently implemented as a demo/mock system using AsyncStorage for session persistence. The architecture supports:
- JWT-based authentication (ready for implementation)
- Role-based access control (admin, hr, client, worker)
- Role switching for demo purposes

### Quo Communication Integration

HR and Admin users have access to Quo messaging and calling features for communicating with workers:

**Quo Tab**: Visible only to HR and Admin roles in the bottom tab bar (phone icon)

**Screens**:
- `QuoMessagesScreen`: Conversation list with ability to compose new messages
- `QuoCallsScreen`: Call history with ability to initiate calls
- `QuoChatScreen`: Individual message thread view (pushed to stack navigation)

**API Endpoints** (require `x-user-role: hr` or `x-user-role: admin` header):
- `GET /api/quo/conversations` - List all conversations
- `GET /api/quo/conversations/:id` - Get single conversation with messages
- `POST /api/quo/messages` - Send a new message
- `GET /api/quo/calls` - List call history
- `POST /api/quo/calls` - Initiate a new call
- `POST /api/quo/dev/inbound` - Dev endpoint to simulate inbound messages

**Provider Architecture**:
- `server/integrations/quo/index.ts` - Main provider interface
- `server/integrations/quo/mockProvider.ts` - Mock provider with in-memory storage for development
- Real provider stubs ready for API credentials integration

**Data Storage**: Uses in-memory storage (matching current backend pattern) with seeded demo data:
- 2 demo conversations with 4 messages
- 2 demo call logs

### Project Structure

```
client/           # React Native Expo frontend
  components/     # Reusable UI components
  contexts/       # React contexts (Auth, Onboarding, WorkerOnboarding)
  hooks/          # Custom hooks (theme, screen options, content padding)
  navigation/     # React Navigation setup
  screens/        # Screen components (including worker onboarding screens)
  storage/        # AsyncStorage helpers, mock data, and onboarding data
  types/          # TypeScript type definitions (includes worker application types)
  utils/          # Formatting utilities and location/GPS helpers
server/           # Express backend
  routes.ts       # API route registration
  storage.ts      # Storage interface (memory/database)
shared/           # Shared code between client and server
  schema.ts       # Drizzle database schema
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, configured via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database toolkit with migration support via `drizzle-kit`

### Frontend Libraries
- **Expo SDK**: Managed workflow with native module support (expo-haptics, expo-image, expo-blur, expo-location)
- **React Navigation**: Navigation framework with native stack and bottom tabs
- **TanStack Query**: Server state management and caching
- **date-fns/date-fns-tz**: Date formatting with timezone support
- **react-native-maps**: Map display for GPS-based time tracking

### Development Tools
- **TypeScript**: Full type coverage across frontend and backend
- **ESLint + Prettier**: Code formatting and linting with Expo config
- **esbuild**: Server bundling for production builds

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: Public domain for API requests (auto-set on Replit)
- `REPLIT_DEV_DOMAIN`: Development domain for CORS (auto-set on Replit)