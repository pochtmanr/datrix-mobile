# TASKS.md — Datrix Mobile Implementation Plan

> Sprint-ready task breakdown organized by phase with dependencies, estimates, and acceptance criteria.

---

## Phase Overview

| Phase | Name | Goal | Depends On |
|-------|------|------|------------|
| **0** | Project Setup | Expo project scaffolded, CI running | — |
| **1** | Auth & Navigation | Login, role routing, tab navigation | Phase 0 |
| **2** | Surveyor Core (Online) | Project list, form filling, photo/GPS | Phase 1 |
| **3** | Offline Engine | WatermelonDB, sync, offline form filling | Phase 2 |
| **4** | Manager Experience | Dashboard, KPIs, record review | Phase 1 |
| **5** | Polish & Notifications | Push notifications, error handling, perf | Phase 3+4 |
| **6** | Testing & Release | E2E tests, beta, production release | Phase 5 |

---

## Phase 0: Project Setup

### T0.1 — Initialize Expo Project
- **Description**: Create Expo project with SDK 52+, TypeScript, Expo Router v4.
- **Steps**:
  1. Run `npx create-expo-app@latest datrix-mobile -t tabs` in `/mobile`.
  2. Configure `app.json` with scheme `datrix`, orientation portrait, platform list.
  3. Set up `tsconfig.json` with strict mode.
  4. Add path aliases (`@/` → `src/`).
- **Acceptance**: `npx expo start` launches on iOS simulator and Android emulator.
- **Estimate**: 2h

### T0.2 — Install & Configure HeroUI Native
- **Description**: Install `heroui-native` and all peer dependencies.
- **Steps**:
  1. `npm install heroui-native`.
  2. Install peer deps: `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `react-native-worklets`, `tailwind-variants`, `tailwind-merge`, `@gorhom/bottom-sheet`.
  3. Install & configure Uniwind (Tailwind v4 for RN).
  4. Create `src/theme/global.css` with `@import 'heroui-native/styles'`.
  5. Wrap app root with `HeroUINativeProvider` + `GestureHandlerRootView`.
- **Acceptance**: A HeroUI `Button` renders correctly with theme colors on both platforms.
- **Estimate**: 3h

### T0.3 — Configure Supabase Client
- **Description**: Set up Supabase JS client with secure token storage.
- **Steps**:
  1. `npm install @supabase/supabase-js expo-secure-store`.
  2. Create `src/api/supabase.ts` with SecureStore adapter (see ARCHITECTURE.md §3.2).
  3. Add Supabase URL + anon key to `app.json` extras.
  4. Verify connection with a simple `supabase.from('projects').select('id').limit(1)`.
- **Acceptance**: Query returns data from Supabase.
- **Estimate**: 1h

### T0.4 — Set Up Directory Structure
- **Description**: Create the full directory structure per CLAUDE.md.
- **Steps**:
  1. Create all directories: `app/(auth)`, `app/(surveyor)`, `app/(manager)`, `src/api/hooks`, `src/auth`, `src/components/*`, `src/db`, `src/lib`, `src/theme`.
  2. Create placeholder `_layout.tsx` files for each route group.
  3. Create placeholder `index.tsx` for root redirect.
- **Acceptance**: Expo Router recognizes all route groups without errors.
- **Estimate**: 1h

### T0.5 — Configure EAS Build
- **Description**: Set up EAS for development and preview builds.
- **Steps**:
  1. `npm install -g eas-cli && eas login`.
  2. Create `eas.json` with development, preview, production profiles.
  3. Run `eas build --profile development --platform ios` (and android).
  4. Verify dev client installs on device/simulator.
- **Acceptance**: Dev client builds successfully for both platforms.
- **Estimate**: 2h

### T0.6 — Add Utility Layer
- **Description**: Create shared utilities used across the app.
- **Steps**:
  1. Port `caseUtils.ts` (snakeToCamel, camelToSnake) from web app.
  2. Create `src/lib/types.ts` with TypeScript interfaces for all entities (Record, Question, Project, etc.).
  3. Create `src/lib/constants.ts` with status labels, role labels (Hebrew), colors.
  4. Create `src/lib/utils.ts` with date formatting (Israel timezone), ID generation.
- **Acceptance**: All types compile, constants importable.
- **Estimate**: 3h

---

## Phase 1: Authentication & Navigation

### T1.1 — Implement AuthProvider
- **Description**: Create auth context with Supabase session management.
- **Steps**:
  1. Create `src/auth/AuthProvider.tsx` wrapping `useEffect` for `onAuthStateChange`.
  2. On session change → fetch `app_users` by `auth_user_id`.
  3. Expose: `user`, `session`, `isLoading`, `isAuthenticated`, `login`, `logout`, `refreshUser`.
  4. Handle edge cases: inactive user, no profile, expired session.
  5. Store user object in state (not in WatermelonDB — fetched fresh on each login).
- **Acceptance**: Auth state persists across app restarts. Logout clears all state.
- **Estimate**: 4h

### T1.2 — Implement Google OAuth Flow
- **Description**: Google sign-in via expo-auth-session.
- **Steps**:
  1. `npm install expo-auth-session expo-web-browser expo-crypto`.
  2. Configure Google Cloud Console OAuth client (iOS + Android + web).
  3. Implement `login()` in AuthProvider using `Google.useAuthRequest()`.
  4. Exchange Google token for Supabase session via `signInWithIdToken`.
  5. Handle OAuth deep link redirect (`datrix://auth-callback`).
- **Acceptance**: Full login flow works on iOS and Android with real Google accounts.
- **Estimate**: 6h

### T1.3 — Build Login Screen
- **Description**: `app/(auth)/login.tsx` with Google sign-in button.
- **Steps**:
  1. Create screen per DESIGN.md §4.1.
  2. App logo, welcome text, "Sign in with Google" button.
  3. Loading state during OAuth flow.
  4. Error toast on failure.
- **Components**: `Surface`, `Button`, `Toast`, `Spinner`.
- **Acceptance**: Login screen renders, button triggers OAuth flow.
- **Estimate**: 2h

### T1.4 — Build Pending Approval Screen
- **Description**: `app/(auth)/pending-approval.tsx` for inactive users.
- **Steps**:
  1. Create screen per DESIGN.md §4.2.
  2. Informational message, refresh button, logout button.
  3. Refresh button re-fetches `app_users` to check if approved.
- **Components**: `Surface`, `Button`.
- **Acceptance**: Inactive users see this screen. Refresh detects approval.
- **Estimate**: 1h

### T1.5 — Implement Role-Based Routing
- **Description**: Root `app/index.tsx` redirects based on user role.
- **Steps**:
  1. Read `user.role` from AuthProvider.
  2. `surveyor` → `/(surveyor)`.
  3. `manager`, `viewer`, `owner`, `admin` → `/(manager)`.
  4. No user → `/(auth)/login`.
  5. Inactive user → `/(auth)/pending-approval`.
- **Acceptance**: Each role lands on correct tab group.
- **Estimate**: 2h

### T1.6 — Build Tab Navigators
- **Description**: Create `_layout.tsx` for both `(surveyor)` and `(manager)` tab groups.
- **Steps**:
  1. Surveyor tabs: Home, Projects, Tasks, Profile (per DESIGN.md §3.1).
  2. Manager tabs: Dashboard, Projects, Reports, Profile (per DESIGN.md §3.2).
  3. Tab icons, Hebrew labels, active/inactive states.
  4. RTL tab order (right-to-left).
- **Acceptance**: Both tab navigators render with correct icons and labels.
- **Estimate**: 3h

---

## Phase 2: Surveyor Core (Online)

### T2.1 — Build React Query Hooks (All Entities)
- **Description**: Create typed React Query hooks for all mobile-relevant entities.
- **Steps**:
  1. `useProjects` — list assigned projects for current user.
  2. `useQuestionnaires` — list active questionnaires for project.
  3. `useQuestions` — list questions for questionnaire (sorted by order_index).
  4. `useRecords` — list/filter records (by project, assignee, status).
  5. `useRecord` — get single record.
  6. `useRecordAnswers` — get answers for a record.
  7. `useRecordPages` — get pages for a record.
  8. `useRecordFiles` — get files for a record.
  9. `useRecordLocations` — get locations for a record.
  10. `useRecordNotes` — get notes for a record.
  11. `useRecordStatusHistory` — get status history for a record.
  12. `useProjectData` — get master data for project.
  13. `useCategories` — get categories for project.
  14. `useAreas` — get areas for project.
  15. Mutation hooks: `useCreateRecord`, `useUpdateRecord`, `useCreateRecordAnswer`, `useUpdateRecordAnswer`, etc.
- **Acceptance**: All hooks return typed data. Mutations invalidate relevant queries.
- **Estimate**: 8h

### T2.2 — Build Surveyor Dashboard
- **Description**: `app/(surveyor)/index.tsx` — home screen.
- **Steps**:
  1. Welcome card with user's name.
  2. KPI row: completed today, pending records.
  3. Project cards with record counts.
  4. Pull-to-refresh.
  5. Loading skeleton state.
  6. Empty state if no projects.
- **Components**: `Surface`, `Card`, `Chip`, `Skeleton`, `Separator`.
- **Acceptance**: Dashboard shows real data from Supabase. Tap project navigates.
- **Estimate**: 4h

### T2.3 — Build Project List Screen
- **Description**: `app/(surveyor)/projects/index.tsx`.
- **Steps**:
  1. List of assigned projects as cards.
  2. Each card shows: name, record count, pending count.
  3. Search/filter by name.
  4. Tap navigates to project detail.
- **Components**: `Card`, `Input` (search), `PressableFeedback`.
- **Acceptance**: All assigned projects display. Search filters correctly.
- **Estimate**: 3h

### T2.4 — Build Project Detail Screen
- **Description**: `app/(surveyor)/projects/[projectId]/index.tsx`.
- **Steps**:
  1. `Tabs`: Questionnaires tab and Records tab.
  2. Questionnaires tab: list of available questionnaires with "Start" button.
  3. Records tab: list of own records with status badges.
  4. "New Survey" button at bottom.
- **Components**: `Tabs`, `Card`, `Chip` (status badge), `Button`.
- **Acceptance**: Both tabs populate. "New Survey" navigates to questionnaire selection.
- **Estimate**: 4h

### T2.5 — Build New Record Flow
- **Description**: `app/(surveyor)/projects/[projectId]/records/new.tsx`.
- **Steps**:
  1. Select questionnaire from available list.
  2. On selection: create Record (status: in_progress, assignee: current user), create RecordPage (page 1), create RecordStatusHistory entry.
  3. Navigate to form filling screen.
- **Components**: `Select` or card list, `Button`.
- **Acceptance**: Record created in Supabase. Navigates to fill screen.
- **Estimate**: 3h

### T2.6 — Build Question Field Components
- **Description**: Individual field components for each question type.
- **Steps**:
  1. `TextField.tsx` — text input (single line).
  2. `TextAreaField.tsx` — multi-line text.
  3. `NumberField.tsx` — numeric input.
  4. `SelectField.tsx` — dropdown (options from `options_json`).
  5. `MultiSelectField.tsx` — checkbox group.
  6. `BooleanField.tsx` — switch or yes/no radio.
  7. `DateField.tsx` — date picker (platform native).
  8. `TimeField.tsx` — time display button.
  9. `PhotoField.tsx` — camera capture + preview.
  10. `GPSField.tsx` — location capture + mini map.
  11. `ReadonlyField.tsx` — disabled display.
  12. `MasterDataField.tsx` — searchable dropdown from project_data.
  13. `CompositeField.tsx` — accordion with nested fields.
  14. `QuestionRenderer.tsx` — dispatcher that picks correct field by type.
- **Acceptance**: Each field type renders correctly with value binding and validation.
- **Estimate**: 16h (largest task — ~1.5h per field type)

### T2.7 — Build Form Filling Screen
- **Description**: `app/(surveyor)/projects/[projectId]/records/[recordId]/fill.tsx` — full-screen modal.
- **Steps**:
  1. Fetch questionnaire questions, existing answers.
  2. Group questions by `section_name`.
  3. Section navigation tabs (scrollable).
  4. Render questions via `QuestionRenderer`.
  5. Auto-save answers on field blur/change.
  6. "Previous" / "Next" section buttons.
  7. Required field validation on section change and submit.
  8. "Save & Close" (draft) and "Submit" buttons.
  9. Submit: validate all → update record status to `form_filled` → create status history → navigate back.
  10. Close button with discard confirmation dialog.
  11. Form progress indicator (sections completed).
- **Components**: `Tabs`, `Card`, `Button`, `Dialog`, `Toast`, `Spinner`, all field components.
- **Acceptance**: Full form can be filled and submitted. Answers persist in Supabase.
- **Estimate**: 12h

### T2.8 — Implement Photo Capture & Upload
- **Description**: Camera integration for PhotoField.
- **Steps**:
  1. `npm install expo-camera expo-image-picker expo-image-manipulator`.
  2. Request camera permission.
  3. Capture or select from gallery.
  4. Compress to ≤2MB via `ImageManipulator`.
  5. Upload to Supabase Storage (`main` bucket).
  6. Create `record_files` entry with URL.
  7. If `ai_analysis_enabled`: invoke `invoke-llm` edge function after upload.
  8. Store AI result in `record_answers.ai_analysis_result`.
  9. Show upload progress and AI result inline.
- **Acceptance**: Photo captures, uploads, displays. AI analysis works when enabled.
- **Estimate**: 6h

### T2.9 — Implement GPS Capture
- **Description**: Location capture for GPSField.
- **Steps**:
  1. `npm install expo-location react-native-maps`.
  2. Request foreground location permission.
  3. Capture high-accuracy coordinates.
  4. Store in `record_locations` table.
  5. For GPS-type questions, store lat/lng as answer value.
  6. Show mini map with pin at captured location.
- **Acceptance**: GPS captures accurately. Map pin displays correctly.
- **Estimate**: 4h

### T2.10 — Build Multi-Page Form Support
- **Description**: Support for "Add Page" in form filling.
- **Steps**:
  1. "Add Page" button creates new `record_pages` entry.
  2. Page tab/swipe navigation at top of form.
  3. Each page has its own set of answers (keyed by `page_id`).
  4. Delete page with confirmation (deletes page + associated answers).
  5. Page number display: "Page 1 of 3".
- **Components**: `Tabs` (page navigation), `Dialog` (delete confirm), `Button`.
- **Acceptance**: Multiple pages can be created, filled, navigated, and deleted.
- **Estimate**: 5h

### T2.11 — Build Tasks Screen (Pending Records)
- **Description**: `app/(surveyor)/tasks.tsx` — cross-project pending records.
- **Steps**:
  1. Fetch all records with `assignee_id = currentUser` and `status IN ('not_started', 'in_progress')`.
  2. Group by project.
  3. Tap record → navigate to form filling.
  4. Empty state: celebration icon + "All done!" message.
- **Components**: `Card`, `Chip`, `Separator`.
- **Acceptance**: Shows pending records across all projects.
- **Estimate**: 3h

### T2.12 — Build Profile Screen
- **Description**: `app/(surveyor)/profile.tsx` (shared with manager).
- **Steps**:
  1. Display user info: avatar, name, email, phone, employee number, role.
  2. Edit button → bottom sheet with editable fields (phone, profile photo).
  3. Profile photo: tap avatar → camera/gallery → upload to `avatars` bucket → update `app_users.profile_image`.
  4. Logout button with confirmation.
  5. App version display.
- **Components**: `Avatar`, `Card`, `Button`, `BottomSheet`, `TextField`, `Dialog`, `Toast`.
- **Acceptance**: Profile displays, edits save to Supabase, avatar uploads work.
- **Estimate**: 4h

---

## Phase 3: Offline Engine

### T3.1 — Set Up WatermelonDB
- **Description**: Install and configure WatermelonDB with schema.
- **Steps**:
  1. `npm install @nozbe/watermelondb @nozbe/with-observables`.
  2. Configure Babel plugin for WatermelonDB decorators.
  3. Define schema in `src/db/schema.ts` (all synced tables per DATABASE.md §7.1).
  4. Create model classes in `src/db/models/` for each table.
  5. Initialize database in app root.
- **Acceptance**: WatermelonDB initializes without errors on both platforms.
- **Estimate**: 6h

### T3.2 — Build Sync Engine (Pull)
- **Description**: Implement incremental pull from Supabase to WatermelonDB.
- **Steps**:
  1. Create `src/db/sync.ts` with `pullChanges()` function.
  2. For each synced table: query Supabase for rows with `updated_at > lastPulledAt`.
  3. Scope to assigned projects only.
  4. Upsert into WatermelonDB.
  5. Update `sync_metadata.last_pulled` per table.
  6. Handle deletions (soft delete via `is_active = false` or hard delete tracking).
- **Acceptance**: Changes made on web appear on mobile after pull.
- **Estimate**: 8h

### T3.3 — Build Sync Engine (Push)
- **Description**: Push local changes to Supabase.
- **Steps**:
  1. Add `pushChanges()` to sync.ts.
  2. Query WatermelonDB for dirty records (created/updated locally).
  3. Upsert to Supabase via PostgREST.
  4. On success: mark as synced, update `sync_metadata.last_pushed`.
  5. On failure: increment retry counter, log error.
  6. Exponential backoff for retries (1s, 2s, 4s, 8s, 16s).
- **Acceptance**: Records created offline appear in Supabase after sync.
- **Estimate**: 8h

### T3.4 — Implement Sync Triggers
- **Description**: Automatic sync scheduling.
- **Steps**:
  1. On app start → full pull.
  2. On write → debounced push (3s).
  3. On reconnect → immediate pull + push.
  4. Periodic pull every 5 min while online.
  5. On app foreground → pull.
  6. Use `@react-native-community/netinfo` for connectivity detection.
- **Acceptance**: Sync runs automatically at all trigger points.
- **Estimate**: 4h

### T3.5 — Integrate WatermelonDB with React Query
- **Description**: Make React Query hooks read from WatermelonDB instead of Supabase directly.
- **Steps**:
  1. Modify entity hooks to read from WatermelonDB (local-first).
  2. Mutation hooks write to WatermelonDB, mark as dirty for sync.
  3. React Query cache populated from WatermelonDB observables.
  4. Background sync keeps WatermelonDB in sync with Supabase.
- **Acceptance**: App works fully offline for survey filling. Data appears from local DB.
- **Estimate**: 8h

### T3.6 — Build Photo Offline Queue
- **Description**: Queue photos for upload when offline.
- **Steps**:
  1. Save photo to `FileSystem.documentDirectory`.
  2. Create Zustand `photoQueueStore` persisted to AsyncStorage.
  3. Queue entry: `{ localUri, recordId, questionId, pageId, status }`.
  4. Process queue FIFO when online.
  5. On success: upload to Supabase Storage → create record_files → remove local file.
  6. On failure: retry with backoff. Show error on profile screen.
- **Acceptance**: Photos captured offline upload when connectivity returns.
- **Estimate**: 6h

### T3.7 — Build Offline UI Indicators
- **Description**: Visual feedback for offline/sync state.
- **Steps**:
  1. `OfflineBanner` component: persistent banner when offline (DESIGN.md §5.1).
  2. Sync status indicator on profile screen (DESIGN.md §5.2).
  3. Photo upload status per photo (DESIGN.md §5.3).
  4. Pending sync count badge on tab bar.
- **Components**: `Chip`, `Spinner`, `Surface`.
- **Acceptance**: Users always know connectivity and sync status.
- **Estimate**: 3h

---

## Phase 4: Manager Experience

### T4.1 — Build Manager Dashboard
- **Description**: `app/(manager)/index.tsx` — KPI dashboard.
- **Steps**:
  1. Project selector dropdown at top.
  2. Date range filter (default: 30 days).
  3. KPI cards: active surveyors, records today, records this week, completion rate.
  4. Status distribution pie chart.
  5. Daily volume line chart.
  6. Pull-to-refresh.
  7. Loading skeletons.
- **Components**: `Select`, `Card`, `Skeleton`. Charts: `victory-native` or `react-native-chart-kit`.
- **Acceptance**: Dashboard shows real KPIs. Charts render correctly.
- **Estimate**: 8h

### T4.2 — Build Manager Project List
- **Description**: `app/(manager)/projects/index.tsx`.
- **Steps**:
  1. All projects (not filtered by assignment — managers see all).
  2. Each card shows: name, total records, completed %, active surveyors.
  3. Search by name.
  4. Tap navigates to project detail.
- **Acceptance**: All projects display with correct stats.
- **Estimate**: 3h

### T4.3 — Build Manager Project Detail
- **Description**: `app/(manager)/projects/[projectId]/index.tsx`.
- **Steps**:
  1. `Tabs`: Records, Team.
  2. Records tab: all records with filters (status, date, assignee, search).
  3. Team tab: surveyors with record counts and completion rates.
  4. Tap record → record detail screen.
- **Components**: `Tabs`, `Card`, `Input`, `Select`, `Chip`.
- **Acceptance**: Records filterable. Team stats accurate.
- **Estimate**: 5h

### T4.4 — Build Record Detail Screen (Manager)
- **Description**: `app/(manager)/projects/[projectId]/records/[recordId].tsx`.
- **Steps**:
  1. `Tabs`: Data, Status, Files, Location, Notes.
  2. Data tab: question/answer pairs, photo thumbnails, AI results.
  3. Status tab: timeline of status changes.
  4. Files tab: attached files with preview.
  5. Location tab: map with pin(s).
  6. Notes tab: existing notes + add new note form.
  7. Status change: dropdown + optional comment + submit.
  8. Status change creates `record_status_history` entry.
- **Components**: `Tabs`, `Card`, `Chip`, `Select`, `TextField`, `TextArea`, `Button`, `Toast`.
- **Acceptance**: All tabs show correct data. Status change persists. Notes addable.
- **Estimate**: 8h

### T4.5 — Build Reports Screen
- **Description**: `app/(manager)/reports.tsx`.
- **Steps**:
  1. Summary cards: total records, completion rate, average fill time.
  2. Quick export button (CSV).
  3. Export: invoke edge function → download/share via native share sheet.
- **Components**: `Card`, `Button`.
- **Acceptance**: Summary stats display. CSV export downloads correctly.
- **Estimate**: 4h

---

## Phase 5: Polish & Notifications

### T5.1 — Implement Push Notifications
- **Description**: End-to-end push notification system.
- **Steps**:
  1. `npm install expo-notifications expo-device`.
  2. Request notification permission on login.
  3. Get Expo push token → store in `app_users.push_token`.
  4. Create Supabase Edge Function `send-push` (Expo Push API).
  5. Add notification triggers (see ARCHITECTURE.md §8.2).
  6. Handle notification tap → deep link to relevant screen.
- **Acceptance**: Notifications received on both platforms. Tap opens correct screen.
- **Estimate**: 8h

### T5.2 — Add Error Boundaries
- **Description**: React error boundaries at route group levels.
- **Steps**:
  1. Global error boundary in `app/_layout.tsx`.
  2. Route group boundaries in `(surveyor)/_layout.tsx` and `(manager)/_layout.tsx`.
  3. Fallback UI: error message + retry button + report link.
  4. Crash reporting integration (Sentry or expo-updates).
- **Acceptance**: Unhandled errors show fallback UI, don't crash the app.
- **Estimate**: 3h

### T5.3 — Performance Optimization
- **Description**: Ensure app meets performance targets.
- **Steps**:
  1. Replace `FlatList` with `FlashList` for all list screens.
  2. Granular HeroUI imports (tree-shaking).
  3. Image optimization with `expo-image`.
  4. Profile startup time — target <3s cold start.
  5. Reduce bundle size — target <20MB.
  6. Lazy-load chart libraries (manager dashboard only).
- **Acceptance**: Cold start <3s, no jank on mid-range devices, bundle <20MB.
- **Estimate**: 6h

### T5.4 — RTL Polish Pass
- **Description**: Verify all screens render correctly in RTL.
- **Steps**:
  1. Audit all screens for logical properties (ps/pe, ms/me, text-start/text-end).
  2. Fix any hardcoded left/right values.
  3. Verify tab bar order (right-to-left).
  4. Verify swipe gestures work in RTL.
  5. Test with Hebrew text of varying lengths.
- **Acceptance**: All screens pixel-perfect in RTL.
- **Estimate**: 4h

### T5.5 — Accessibility Pass
- **Description**: Ensure VoiceOver/TalkBack compatibility.
- **Steps**:
  1. Add `accessibilityLabel` to all interactive elements.
  2. Set `accessibilityRole` correctly.
  3. Verify touch targets ≥44×44 pt.
  4. Test full survey flow with VoiceOver (iOS) and TalkBack (Android).
  5. Fix any focus order issues.
- **Acceptance**: Full survey flow completable with screen reader.
- **Estimate**: 4h

---

## Phase 6: Testing & Release

### T6.1 — Unit Tests
- **Description**: Jest tests for utilities and business logic.
- **Steps**:
  1. Case conversion utilities (snakeToCamel, camelToSnake).
  2. ID generation.
  3. Date formatting.
  4. Sync engine logic (conflict resolution, retry backoff).
  5. Form validation logic.
- **Acceptance**: >80% coverage on utility layer.
- **Estimate**: 4h

### T6.2 — Component Tests
- **Description**: React Native Testing Library tests for key components.
- **Steps**:
  1. Each question field type: renders, accepts input, validates.
  2. QuestionRenderer: dispatches to correct field.
  3. RecordCard: displays data correctly.
  4. KPICard: shows loading/loaded/error states.
  5. OfflineBanner: shows/hides based on connectivity.
- **Acceptance**: All field types tested. Edge cases covered.
- **Estimate**: 6h

### T6.3 — E2E Tests
- **Description**: Maestro tests for critical paths.
- **Steps**:
  1. Login flow (Google OAuth mock).
  2. Surveyor: view projects → select questionnaire → fill form → submit.
  3. Manager: view dashboard → drill into project → view record detail.
  4. Profile: view → edit → save.
  5. Offline: fill form offline → go online → verify sync.
- **Acceptance**: All critical paths pass on CI.
- **Estimate**: 8h

### T6.4 — Beta Release
- **Description**: Internal beta via EAS + TestFlight / Google Play Internal Testing.
- **Steps**:
  1. Build preview profile: `eas build --profile preview`.
  2. Submit iOS to TestFlight.
  3. Submit Android to Internal Testing track.
  4. Distribute to internal testers.
  5. Collect feedback, prioritize fixes.
- **Acceptance**: Beta available to internal testers on both platforms.
- **Estimate**: 4h

### T6.5 — Production Release
- **Description**: First production release.
- **Steps**:
  1. Build production profile: `eas build --profile production`.
  2. Submit iOS to App Store review.
  3. Submit Android to Google Play review.
  4. Prepare app store listing (screenshots, description in Hebrew).
  5. Monitor crash reports post-launch.
  6. Set up OTA updates via `expo-updates` for rapid fixes.
- **Acceptance**: App live on both stores.
- **Estimate**: 6h

---

## Dependency Graph

```
Phase 0 ─── T0.1 → T0.2 → T0.4
         ├── T0.3 (parallel with T0.2)
         ├── T0.5 (parallel with T0.2)
         └── T0.6 (parallel with T0.2)

Phase 1 ─── T1.1 → T1.2 → T1.3
         ├── T1.4 (after T1.1)
         ├── T1.5 (after T1.1)
         └── T1.6 (after T1.5)

Phase 2 ─── T2.1 (after Phase 1)
         ├── T2.2 → T2.3 → T2.4 → T2.5 (sequential screens)
         ├── T2.6 (parallel, after T2.1)
         ├── T2.7 (after T2.4 + T2.6)
         ├── T2.8 (after T2.6, PhotoField)
         ├── T2.9 (after T2.6, GPSField)
         ├── T2.10 (after T2.7)
         ├── T2.11 (after T2.1)
         └── T2.12 (after T1.6)

Phase 3 ─── T3.1 (after Phase 2)
         ├── T3.2 → T3.3 → T3.4 (sequential sync engine)
         ├── T3.5 (after T3.4)
         ├── T3.6 (after T3.3)
         └── T3.7 (after T3.4)

Phase 4 ─── T4.1 (after Phase 1 + T2.1)
         ├── T4.2 → T4.3 → T4.4 (sequential screens)
         └── T4.5 (after T4.1)

Phase 5 ─── T5.1 (after Phase 3 + Phase 4)
         ├── T5.2 (after Phase 4)
         ├── T5.3 (after Phase 4)
         ├── T5.4 (after Phase 4)
         └── T5.5 (after Phase 4)

Phase 6 ─── T6.1 + T6.2 (after Phase 5)
         ├── T6.3 (after T6.1 + T6.2)
         ├── T6.4 (after T6.3)
         └── T6.5 (after T6.4)
```

---

## Effort Summary

| Phase | Tasks | Total Estimate |
|-------|-------|---------------|
| Phase 0: Setup | 6 | 12h |
| Phase 1: Auth & Nav | 6 | 18h |
| Phase 2: Surveyor Core | 12 | 72h |
| Phase 3: Offline | 7 | 43h |
| Phase 4: Manager | 5 | 28h |
| Phase 5: Polish | 5 | 25h |
| Phase 6: Testing | 5 | 28h |
| **Total** | **46 tasks** | **~226h** |

---

## Self-Check

- [x] Every task has description, steps, acceptance criteria, and estimate
- [x] Dependency graph shows which tasks can run in parallel
- [x] Phases align with PRD.md §9 (Release Plan)
- [x] Component references match DESIGN.md component mapping
- [x] Database operations match DATABASE.md queries
- [x] Architecture patterns match ARCHITECTURE.md (sync engine, auth, state)
- [x] Offline tasks explicitly cover all scenarios from PRD.md F1
- [x] No admin features included (PRD.md §6 Non-Goals respected)
- [x] HeroUI Native components specified per task
- [x] Effort estimates are realistic for a senior developer
- [x] Tasks are granular enough for sprint planning (2-16h each)
- [x] Critical path identified: Setup → Auth → Surveyor Core → Offline is the longest chain
