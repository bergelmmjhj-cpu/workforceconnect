# Workforce Connect - Design Guidelines

## Brand Identity

**Purpose**: Enterprise workforce management platform connecting Clients, Workers, and HR teams for shift deployment, time tracking, and workflow coordination.

**Aesthetic Direction**: **Professional Editorial** - Clean typographic hierarchy with purposeful use of color to signal status and priority. Think Bloomberg Terminal meets modern SaaS - data-dense but scannable, with subtle premium touches that signal reliability.

**Memorable Element**: **Smart status system** with color-coded priority indicators and a unified notification badge that adapts across all user roles. The "Smart To-Do" widget becomes the command center for each role.

## Navigation Architecture

**Root Navigation**: Role-adaptive Tab Navigation (mobile) / Sidebar (desktop)

**Screens by Role**:

**Client Role** (4 tabs):
1. Dashboard - Smart To-Do widget, active requests overview
2. Requests - Create/manage worker requests
3. Shifts - View approved shifts with TITO status
4. Messages - Conversations with HR

**Worker Role** (4 tabs):
1. Dashboard - Upcoming shifts, pending TITO submissions
2. Shifts - Assigned shifts with check-in/out actions
3. TITO - Time tracking history and status
4. Messages - Conversations with HR

**HR Role** (5 tabs):
1. Dashboard - SLA alerts, pending approvals, Smart To-Do
2. Requests - Incoming client requests (sorted by SLA)
3. Shifts - Shift creation and worker assignment
4. TITO - Review/approve worker time logs
5. Messages - All conversations

**Admin Role** (4 tabs):
1. Dashboard - System overview, audit alerts
2. Users - User management
3. Reports - Analytics and CSV exports
4. Messages - System-wide oversight

## Screen-by-Screen Specifications

### Dashboard (All Roles)
- **Header**: Transparent with notification bell (right), user avatar menu (far right)
- **Layout**: Scrollable, cards stacked vertically
- **Top Inset**: headerHeight + 24px
- **Bottom Inset**: tabBarHeight + 24px (mobile) / 24px (desktop)
- **Components**:
  - Welcome header: "Good morning, [Name]" with current time in user's timezone
  - Smart To-Do Widget: Role-specific priority cards (SLA breaches in red, urgent in amber, normal in blue)
  - Stat Cards (3-column grid on desktop, stacked on mobile): Active requests, Pending approvals, Hours this week
  - Quick Actions: Floating action button (mobile) / primary button group (desktop)
- **Empty State**: If no tasks, show illustration (empty-dashboard.png) with encouraging message

### Requests List (Client/HR)
- **Header**: Standard with search bar, filter icon (right), create button (far right for Client)
- **Layout**: Scrollable list
- **Components**:
  - Search bar (sticky below header)
  - Filter chips: Status (All, Draft, Submitted, Assigned, Completed)
  - Request cards: Role needed, intersection, date/time, status pill, SLA countdown (if applicable)
  - Pull-to-refresh
- **Empty State**: illustration (empty-requests.png) + "No requests yet" + CTA button

### Request Detail (Modal on mobile, slide-over on desktop)
- **Header**: Custom with back button (left), "Edit" button (right, if owner)
- **Layout**: Scrollable form
- **Components**:
  - Status banner at top (color-coded)
  - Readonly fields: Request ID, Created date, Client name
  - Editable fields (if draft): Role needed, Shift start/end, Location, Pay structure, Notes
  - Action buttons at bottom: Submit (client), Assign HR (admin), Create Shift (HR)
  - Audit trail accordion (collapsed by default)

### Shifts List (HR/Worker/Client)
- **Header**: Standard with calendar icon (right), filter icon (far right)
- **Layout**: Scrollable list or calendar view toggle
- **Components**:
  - Date range selector (week view default)
  - Shift cards: Worker name (HR view), role, time range, location, status, TITO status
  - Color-coded left border: Scheduled (blue), In Progress (green), Completed (gray), Cancelled (red)
- **Empty State**: illustration (empty-shifts.png) + "No shifts scheduled"

### Shift Detail
- **Header**: Custom with back button, overflow menu (right)
- **Layout**: Scrollable
- **Components**:
  - Shift info card: Worker, client, role, datetime, location
  - TITO section: Check-in/out buttons (worker) OR approval cards (HR/client)
  - Worker assignment list (HR only): Add/remove workers
  - Notes section

### TITO Submission (Worker, native modal)
- **Header**: "Submit Time" with cancel (left)
- **Layout**: Scrollable form
- **Top/Bottom Inset**: insets.top/bottom + 24px
- **Components**:
  - Time picker: Clock-in / Clock-out
  - Location input (optional coarse string, e.g., "King & Bay")
  - Verification method selector (GPS, Manual, etc.)
  - Photo upload placeholder (future)
  - Submit button below form (full-width, primary color)

### TITO Review List (HR/Client)
- **Header**: Standard with filter icon
- **Layout**: Scrollable list
- **Components**:
  - Filter: Pending, Approved, Disputed
  - TITO cards: Worker name, shift, times, verification method, approve/dispute buttons
- **Empty State**: illustration (empty-tito.png) + "No time logs to review"

### Messages
- **Header**: Custom with search icon (right), new message button (far right, HR only)
- **Layout**: Two-pane (desktop) / stack (mobile)
- **Components**:
  - Conversation list (left pane): Avatar, name, last message preview, timestamp, unread badge
  - Message thread (right pane): Messages with sender avatar, timestamp, read receipts
  - Input bar (sticky bottom): Text input, attachment icon, send button
- **Empty State**: illustration (empty-messages.png) + "No conversations"

### Reports (HR/Admin)
- **Header**: Standard with date range picker (right), export button (far right)
- **Layout**: Scrollable
- **Components**:
  - Filter cards: Date range, role, client
  - Report cards: Shifts per worker, Hours worked, Approvals pending, SLA breaches
  - Table view (desktop) / card view (mobile)
  - Export CSV button

### User Management (Admin only)
- **Header**: Standard with search, add user button (right)
- **Layout**: Scrollable table (desktop) / list (mobile)
- **Components**:
  - User cards/rows: Name, email, role, status, actions (edit, deactivate)
- **Empty State**: Should never be empty (admin exists)

### Profile/Settings (accessed via avatar menu in header)
- **Header**: "Account" with close button
- **Layout**: Scrollable list of settings
- **Components**:
  - Avatar + display name + email (readonly)
  - Timezone selector
  - Notification preferences toggle
  - App version
  - Log out button (danger zone, with confirmation)
  - Delete account (nested: Settings > Account > Delete, double confirmation)

## Color Palette

- **Primary**: #1E40AF (deep blue - trust, stability)
- **Primary Light**: #3B82F6
- **Primary Dark**: #1E3A8A
- **Accent**: #F59E0B (amber - urgency, attention)
- **Success**: #10B981 (green)
- **Warning**: #F59E0B (amber)
- **Error**: #EF4444 (red)
- **Background**: #F8FAFC (cool gray-50)
- **Surface**: #FFFFFF
- **Surface Elevated**: #FFFFFF with shadow
- **Border**: #E2E8F0 (gray-200)
- **Text Primary**: #0F172A (slate-900)
- **Text Secondary**: #64748B (slate-500)
- **Text Muted**: #94A3B8 (slate-400)

**Status Colors**:
- Draft: #94A3B8 (gray)
- Submitted: #3B82F6 (blue)
- In Progress: #10B981 (green)
- Completed: #64748B (slate)
- Cancelled: #EF4444 (red)
- SLA Warning: #F59E0B (amber)
- SLA Breach: #EF4444 (red)

## Typography

**Font**: Inter (Google Font) - modern, legible, professional at all sizes

**Type Scale**:
- **Display**: 32px / Bold / -0.02em
- **H1**: 24px / Bold / -0.01em
- **H2**: 20px / Semibold / -0.01em
- **H3**: 18px / Semibold / normal
- **Body**: 16px / Regular / normal
- **Body Small**: 14px / Regular / normal
- **Caption**: 12px / Regular / 0.01em
- **Label**: 14px / Medium / 0.01em

## Visual Design

- **Icons**: Feather icons from @expo/vector-icons, 20px default size
- **Touchable Feedback**: 0.7 opacity on press for all buttons/cards
- **Shadows**: Floating buttons only:
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- **Border Radius**: 8px (cards), 6px (buttons), 4px (inputs)
- **Spacing Scale**: 4px base (4, 8, 12, 16, 24, 32, 48)

## Assets to Generate

1. **icon.png** - App icon: Stylized "W" with clock hands, blue gradient
   - WHERE USED: Device home screen

2. **splash-icon.png** - Simplified icon for splash screen
   - WHERE USED: App launch screen

3. **empty-dashboard.png** - Clipboard with checkmark, soft blue tones
   - WHERE USED: Dashboard when no tasks

4. **empty-requests.png** - Document stack with search magnifier
   - WHERE USED: Requests list when empty

5. **empty-shifts.png** - Calendar page with clock icon
   - WHERE USED: Shifts list when empty

6. **empty-tito.png** - Stopwatch with checkmark
   - WHERE USED: TITO review list when empty

7. **empty-messages.png** - Speech bubbles overlapping
   - WHERE USED: Messages list when empty

8. **avatar-client.png** - Professional silhouette, blue accent
   - WHERE USED: Default client avatar

9. **avatar-worker.png** - Professional silhouette, green accent
   - WHERE USED: Default worker avatar

10. **avatar-hr.png** - Professional silhouette, purple accent
    - WHERE USED: Default HR avatar

11. **avatar-admin.png** - Professional silhouette, amber accent
    - WHERE USED: Default admin avatar

All illustrations should be minimal, line-art style with 1-2 color accents from the palette. Avoid busy details.