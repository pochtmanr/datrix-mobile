# PRD.md — Datrix Mobile Product Requirements

> Product Requirements Document for the Datrix Mobile application.

---

## 1. Product Vision

Datrix Mobile is a field-oriented companion app that enables **surveyors** to collect survey data (including photos, GPS, and structured answers) and **project managers** to monitor collection progress, review submissions, and manage team assignments — all while working offline in areas with poor connectivity.

The mobile app is **not** a replica of the web dashboard. It is purpose-built for two non-admin roles and optimized for field conditions: one-handed use, unreliable networks, camera-first data capture, and Hebrew RTL text.

---

## 2. Target Users

### 2.1 Surveyor (סוקר)
- **Who**: Field workers who physically visit locations to collect survey data.
- **Context**: Outdoors, often in areas with poor or no cellular coverage. Uses phone one-handed.
- **Goals**: Open assigned surveys, fill forms quickly, capture photos/GPS, submit when back online.
- **Technical**: Android 11+ or iOS 15+. Mid-range devices common.

### 2.2 Project Manager (מנהל פרויקט)
- **Who**: Team leads who oversee surveyors and track data collection.
- **Role names in system**: `manager`, `viewer`, `owner` (all route to the manager experience).
- **Context**: Office or field. Uses the app to check progress between web dashboard sessions.
- **Goals**: View project KPIs, review submitted records, monitor surveyor activity, reassign work.
- **Technical**: Same device requirements as surveyors.

### 2.3 Excluded: Admin (מנהל מערכת)
- Admins manage the platform exclusively via the web dashboard.
- If an admin logs into the mobile app, they see the Manager experience (their admin functions are web-only).

---

## 3. Roles & Permissions Matrix

| Capability | Surveyor | Manager/Viewer/Owner |
|-----------|----------|---------------------|
| View assigned projects | Yes | Yes (all projects) |
| View project records | Own records only | All project records |
| Create new records | Yes | Yes |
| Fill survey forms | Yes | Yes |
| Capture photos | Yes | Yes |
| Capture GPS location | Yes | Yes |
| Add record notes | Yes | Yes |
| View record details | Own records | All records |
| View project KPIs/charts | No | Yes |
| View team member stats | No | Yes |
| Change record status | Submit own (not_started → form_filled) | Any status transition |
| Assign records to users | No | Yes |
| Export data | No | Yes (CSV) |
| Edit own profile | Yes | Yes |
| Manage users | No | No (web only) |
| Create questionnaires | No | No (web only) |
| System settings | No | No (web only) |

---

## 4. Core User Flows

### 4.1 Authentication

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│ App Launch   │────▶│ Check stored │────▶│ Session valid?   │
│              │     │ Supabase     │     │                  │
└─────────────┘     │ session      │     │ YES → Role check │
                    └──────────────┘     │ NO  → Login      │
                                         └──────────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                    │ Login Screen │  │ Pending      │  │ Role-based   │
                    │ Google OAuth │  │ Approval     │  │ redirect     │
                    │ via Supabase │  │ Screen       │  │ to tab group │
                    └──────────────┘  └──────────────┘  └──────────────┘
```

**Flow details**:
1. App launches → check `supabase.auth.getSession()` for persisted session.
2. If valid session → fetch `app_users` profile by `auth_user_id`.
3. If `is_active === false` → show "Pending Approval" screen. User cannot proceed.
4. If `is_active === true` → read `role` field → route to Surveyor or Manager tab group.
5. If no session → show login screen with "Sign in with Google" button.
6. On successful OAuth → Supabase trigger auto-provisions `app_users` row (see DATABASE.md §4).
7. Post-login → same profile fetch + role routing as step 2–4.

**Session persistence**: Supabase JS client stores tokens in secure storage. Sessions auto-refresh.

**Logout**: Clears Supabase session + local offline DB → returns to login screen.

### 4.2 Surveyor: Survey Completion Flow

This is the primary flow of the entire app.

```
┌────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────────┐
│ Dashboard   │──▶│ Project List │──▶│ Project View │──▶│ Select        │
│ (My stats)  │   │              │   │ (Records +   │   │ Questionnaire │
└────────────┘    └──────────────┘   │ Questionnaires)│  └───────────────┘
                                      └──────────────┘          │
                                                                ▼
┌────────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────────┐
│ Submit / Save  │◀──│ Review       │◀──│ Fill Form    │◀──│ New Record    │
│ & Close        │   │ Answers      │   │ (Sections)   │   │ Created       │
└────────────────┘    └──────────────┘    └──────────────┘    └───────────────┘
```

**Step-by-step**:
1. Surveyor sees dashboard with: welcome message, today's stats (submitted/pending), project cards.
2. Taps a project card → sees project detail: questionnaires available, list of own records.
3. Taps "New Survey" → selects a questionnaire → system creates a `Record` (status: `in_progress`), a `RecordPage` (page 1), and a `RecordStatusHistory` entry.
4. Form opens in full-screen mode. Questions grouped by `section_name`. Section navigation at top.
5. For each question, the appropriate field renders (text, number, select, photo, GPS, etc.).
6. **Photo capture**: Camera opens → photo saved to local storage → queued for Supabase upload when online → if `ai_analysis_enabled`, AI analysis runs after upload.
7. **GPS capture**: Request location permission → capture coordinates → store in `RecordLocation`.
8. **Multi-page**: "Save & Add Page" creates new `RecordPage`, allowing repeated sections.
9. **Save draft**: Answers auto-save to local DB. Surveyor can close and resume later.
10. **Submit**: Surveyor taps "Submit" → validates required fields → sets `status = 'form_filled'` + `end_time` → creates `RecordStatusHistory` entry → record marked complete.
11. **Sync**: When online, all local changes push to Supabase.

### 4.3 Surveyor: Resume Incomplete Survey

1. On project view, surveyor sees records with status `in_progress`.
2. Taps record → form re-opens with all previously saved answers populated.
3. Continues filling → submits when done.

### 4.4 Manager: Dashboard & Monitoring

```
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│ Dashboard   │──▶│ Project      │──▶│ Record       │
│ (KPIs +    │   │ Detail       │   │ Detail       │
│ Charts)    │   │ (Records +   │   │ (Data, Files,│
└────────────┘   │ Team Stats)  │   │ Status, GPS) │
                  └──────────────┘    └──────────────┘
```

**Dashboard features**:
- KPI cards: Active surveyors, Records today, Records this week, Completion rate.
- Charts: Status distribution (pie), Daily volume (line), Records by surveyor (bar).
- Project selector dropdown to filter all data.
- Date range filter (default: last 30 days).

**Project detail features**:
- Record list with filters: status, date range, assignee, search.
- Team stats: records per surveyor, completion rates.
- Tap record → full detail view with tabs: Data, Status History, Files, Location, Notes.

### 4.5 Manager: Record Review

1. Manager navigates to a project → record list.
2. Taps a record → sees full detail in a bottom sheet or screen.
3. **Data tab**: All question/answer pairs, photos displayed inline, AI analysis results.
4. **Status tab**: Timeline of status changes.
5. **Files tab**: Attached files with preview.
6. **Location tab**: Map with pin at captured coordinates.
7. **Notes tab**: Existing notes + ability to add new notes.
8. Manager can change record status (e.g., `form_filled` → `passed_quality_control`).

### 4.6 Profile Management

Both roles:
1. Navigate to profile tab.
2. View: name, email, phone, profile photo, employee number, role.
3. Edit: phone number, profile photo (camera or gallery).
4. Profile photo uploads to Supabase `avatars` bucket.

---

## 5. Feature Specifications

### F1: Offline Survey Completion
- **Priority**: P0 (critical)
- **Description**: Surveyors must be able to fill surveys without internet connectivity.
- **Behavior**:
  - All assigned questionnaires, questions, and master data cached locally on sync.
  - Answers saved to local WatermelonDB immediately.
  - Photos saved to device storage, queued for upload.
  - GPS captured from device sensors (no network needed for GPS).
  - When connectivity returns, sync engine pushes all pending changes.
  - Visual indicator shows sync status (synced / pending / error).
- **Scope**: Offline applies to survey filling only. Dashboard charts require connectivity.

### F2: Photo Capture with AI Analysis
- **Priority**: P0
- **Description**: Surveyors capture photos as part of survey answers. Some questions trigger AI analysis.
- **Behavior**:
  - Camera opens via `expo-camera` or gallery via `expo-image-picker`.
  - Photo compressed to max 2MB before storage.
  - Stored locally first, uploaded to Supabase `main` bucket when online.
  - If question has `ai_analysis_enabled = true`:
    - After upload, invoke `invoke-llm` edge function with photo URL + prompt + schema.
    - Results stored in `record_answers.ai_analysis_result`.
    - Displayed inline below the photo.
  - AI analysis is asynchronous and requires connectivity. Does not block form submission.

### F3: GPS Location Capture
- **Priority**: P0
- **Description**: Record the physical location where a survey is filled.
- **Behavior**:
  - Request `expo-location` foreground permission on first GPS question.
  - Capture latitude, longitude, accuracy.
  - Store in `record_locations` table.
  - For GPS-type questions, also store as answer value.
  - Display on map (react-native-maps) in record detail view.

### F4: Multi-Page Forms
- **Priority**: P1
- **Description**: Some surveys require repeating sections (e.g., multiple units in a building).
- **Behavior**:
  - "Add Page" button creates new `record_page`.
  - Each page has its own set of answers.
  - Page navigation: swipe or tab bar at top.
  - Delete page with confirmation dialog.

### F5: Manager KPI Dashboard
- **Priority**: P1
- **Description**: Project managers see real-time KPIs and charts.
- **Behavior**:
  - Requires connectivity (no offline caching of charts).
  - KPI cards with animated counters.
  - Pie chart: record status distribution.
  - Line chart: daily record volume (last 30 days).
  - Filterable by project and date range.
  - Pull-to-refresh to update data.

### F6: Record Status Workflow
- **Priority**: P1
- **Description**: Records move through a defined status workflow.
- **Statuses**: `not_started` → `in_progress` → `form_filled` → `handled` → `sent_to_control` → `passed_quality_control`
- **Surveyor transitions**: `not_started` → `in_progress` (automatic on open), `in_progress` → `form_filled` (on submit).
- **Manager transitions**: Any status → any subsequent status. Can also revert.
- **Each transition**: Creates `record_status_history` entry with timestamp, user, and optional comment.

### F7: Push Notifications
- **Priority**: P2
- **Description**: Notify users of relevant events.
- **Triggers**:
  - Surveyor: New questionnaire assigned, record returned for revision.
  - Manager: Record submitted by surveyor, sync errors.
- **Implementation**: Expo Push Notifications + Supabase Edge Function for sending.
- **Device token**: Stored in `app_users` table (new column: `push_token`).

### F8: Master Data Lookup
- **Priority**: P1
- **Description**: Some questions pull from master data tables for dropdown options and autofill.
- **Behavior**:
  - `project_data` entries cached locally during sync.
  - MasterDataQuestion renders as searchable dropdown.
  - On selection, autofill mappings populate other fields automatically.
  - Works offline with cached data.

### F9: Data Export (Manager)
- **Priority**: P2
- **Description**: Managers can export project records as CSV.
- **Behavior**:
  - Export button on project records screen.
  - Generates CSV via edge function.
  - Downloads or shares via native share sheet.
  - Requires connectivity.

---

## 6. Non-Goals (Explicitly Out of Scope)

| Non-Goal | Rationale |
|----------|-----------|
| Admin functionality | Admins use the web dashboard exclusively |
| Questionnaire builder | Forms are created on the web; mobile only consumes them |
| User management | Creating/editing users is admin-only on web |
| Client management | Web-only admin function |
| Report automation setup | Web-only feature; mobile shows read-only dashboards |
| Import/export of master data | Web-only admin function |
| Public form links | Public forms are web URLs, not in-app |
| Activity log viewing | Admin-only web feature |
| Issue tracker | Admin-only web feature |
| Real-time collaboration | Not required; surveys are single-user activities |
| Tablet-optimized layout | Phones only for v1; tablet is future enhancement |
| Landscape mode | Portrait-locked for v1 |
| Deep linking from web | Future enhancement |
| In-app chat / messaging | Not planned |
| Biometric authentication | Future enhancement; Google OAuth only for v1 |

---

## 7. Assumptions

1. **Shared backend**: Mobile uses the same Supabase project, tables, and RLS policies as the web app. No mobile-specific tables except for sync metadata.
2. **Google OAuth only**: No email/password auth. All users sign in with Google.
3. **Hebrew primary**: All UI text is in Hebrew. No multi-language support for v1.
4. **RTL layout**: App renders right-to-left throughout.
5. **Phone-only**: Designed for phone form factor. No tablet-specific layouts.
6. **Mid-range devices**: Must perform well on devices with 3GB RAM, mid-range CPU.
7. **Connectivity varies**: Surveyors may be offline for hours. Sync handles eventual consistency.
8. **Admin creates content**: Questionnaires, projects, master data, and user accounts are all created by admins on the web before surveyors use them on mobile.
9. **No data conflicts**: Only the record creator (surveyor) edits answers. Managers only change status. No concurrent edits on the same record.
10. **Photo size**: Photos compressed to ≤2MB. Originals not preserved.
11. **Push token storage**: A `push_token` TEXT column will be added to `app_users`. This is the only schema addition required.

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Offline form completion rate | 100% of started forms can be completed offline | QA testing |
| Sync success rate | >99% of offline records sync successfully | Error logs |
| Form fill time | ≤3 min for a 20-question form | Analytics |
| App crash rate | <1% of sessions | Expo crash reporting |
| Time to first interaction | <3s cold start on mid-range device | Performance profiling |
| Push notification delivery | >95% delivery rate | Supabase logs |

---

## 9. Release Plan

| Phase | Scope | Milestone |
|-------|-------|-----------|
| **Phase 1: Core** | Auth, Surveyor flow (online), Project list, Form filling, Photo/GPS capture | Internal testing |
| **Phase 2: Offline** | WatermelonDB integration, Offline form filling, Sync engine, Offline indicators | Beta release |
| **Phase 3: Manager** | Manager dashboard, KPI charts, Record review, Status management | Feature-complete |
| **Phase 4: Polish** | Push notifications, Data export, Performance optimization, Error handling | Production release |

---

## 10. Self-Check

- [x] Two user roles defined with clear permission boundaries
- [x] All core flows documented with step-by-step detail
- [x] Feature specs include priority, description, and behavior
- [x] Non-goals explicitly stated to prevent scope creep
- [x] Assumptions documented to remove ambiguity
- [x] Offline-first is a first-class requirement, not an afterthought
- [x] No admin functionality included
- [x] Hebrew RTL requirement stated
- [x] Shared Supabase backend constraint respected
- [x] Success metrics are measurable
- [x] Release plan provides phased delivery
- [x] Cross-referenced with CLAUDE.md tech stack
