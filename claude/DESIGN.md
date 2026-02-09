# DESIGN.md — Datrix Mobile UI/UX Specification

> Complete UI/UX specification using HeroUI Native components exclusively.

---

## 1. Design Principles

1. **Field-first**: Every interaction optimized for one-handed, outdoor use on a phone.
2. **Offline-visible**: Users always know their connectivity and sync status.
3. **Minimal taps**: Survey filling requires the fewest possible interactions.
4. **RTL-native**: Hebrew text, right-to-left layout, logical spacing properties.
5. **HeroUI Native only**: No custom primitives. Every element maps to a HeroUI Native component.

---

## 2. Theme Configuration

### 2.1 Color Tokens (global.css)

```css
@layer theme {
  @variant light {
    /* Primary: Datrix Blue (matches web: #1E3A8A) */
    --primary: oklch(0.35 0.12 260);
    --primary-foreground: oklch(0.99 0 0);

    /* Secondary: Interactive Blue (#2563EB) */
    --secondary: oklch(0.55 0.18 260);
    --secondary-foreground: oklch(0.99 0 0);

    /* Accent: Sky (#38BDF8) */
    --accent: oklch(0.75 0.14 230);
    --accent-foreground: oklch(0.15 0 0);

    /* Semantic */
    --success: oklch(0.65 0.18 145);
    --warning: oklch(0.75 0.15 80);
    --danger: oklch(0.55 0.22 25);

    /* Surfaces */
    --background: oklch(0.97 0 0);
    --foreground: oklch(0.15 0 0);
    --muted: oklch(0.92 0 0);
    --muted-foreground: oklch(0.5 0 0);

    /* Border & radius */
    --border: oklch(0.88 0 0);
    --radius: 0.75rem;
  }

  @variant dark {
    --primary: oklch(0.6 0.15 260);
    --primary-foreground: oklch(0.99 0 0);
    --secondary: oklch(0.65 0.18 260);
    --secondary-foreground: oklch(0.99 0 0);
    --accent: oklch(0.7 0.14 230);
    --accent-foreground: oklch(0.99 0 0);
    --success: oklch(0.65 0.18 145);
    --warning: oklch(0.75 0.15 80);
    --danger: oklch(0.55 0.22 25);
    --background: oklch(0.13 0 0);
    --foreground: oklch(0.93 0 0);
    --muted: oklch(0.2 0 0);
    --muted-foreground: oklch(0.6 0 0);
    --border: oklch(0.25 0 0);
    --radius: 0.75rem;
  }
}
```

### 2.2 Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-2xl` | 24px | Bold | Screen titles |
| `text-xl` | 20px | Semibold | Section headers |
| `text-lg` | 18px | Medium | Card titles, KPI values |
| `text-base` | 16px | Regular | Body text, form labels |
| `text-sm` | 14px | Regular | Secondary text, timestamps |
| `text-xs` | 12px | Regular | Captions, badges |

Font: System default (San Francisco on iOS, Roboto on Android). Hebrew renders natively.

### 2.3 Spacing Scale

Standard Tailwind spacing: `1` = 4px. Common values: `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px).

All horizontal spacing uses logical properties:
- `ps-4` (padding-start, not padding-left)
- `me-2` (margin-end, not margin-right)
- `text-start` (not text-right for RTL)

---

## 3. Navigation Structure

### 3.1 Surveyor Tab Bar

```
┌──────────────────────────────────────────────┐
│                                              │
│              [ Screen Content ]              │
│                                              │
├──────────┬──────────┬──────────┬────────────┤
│  Home    │ Projects │  Tasks   │  Profile   │
│   🏠     │   📁     │   ✅     │    👤      │
└──────────┴──────────┴──────────┴────────────┘
```

| Tab | Screen | Purpose |
|-----|--------|---------|
| Home | SurveyorDashboard | Today's stats, quick actions |
| Projects | ProjectsList | All assigned projects |
| Tasks | PendingRecords | Records not yet submitted |
| Profile | UserProfile | View/edit profile, logout |

### 3.2 Manager Tab Bar

```
┌──────────────────────────────────────────────┐
│                                              │
│              [ Screen Content ]              │
│                                              │
├──────────┬──────────┬──────────┬────────────┤
│Dashboard │ Projects │ Reports  │  Profile   │
│   📊     │   📁     │   📈     │    👤      │
└──────────┴──────────┴──────────┴────────────┘
```

| Tab | Screen | Purpose |
|-----|--------|---------|
| Dashboard | ManagerDashboard | KPIs, charts, team overview |
| Projects | ProjectsList | All projects with stats |
| Reports | ReportsSummary | Quick report access, export |
| Profile | UserProfile | Profile + settings |

### 3.3 Stack Navigation (within tabs)

```
Projects tab:
  ProjectsList → ProjectDetail → RecordDetail
                              → FillForm (full-screen modal)
                              → NewRecord → FillForm

Dashboard tab (Manager):
  ManagerDashboard → ProjectDetail → RecordDetail
```

FillForm always opens as a **full-screen modal** (not pushed onto stack) to prevent accidental back navigation.

---

## 4. Screen Specifications

### 4.1 Login Screen

```
┌──────────────────────────────────┐
│                                  │
│         ┌──────────┐             │
│         │  DATRIX  │             │
│         │   Logo   │             │
│         └──────────┘             │
│                                  │
│      ברוכים הבאים לדטריקס        │
│     Welcome to Datrix            │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🔵 התחברות עם Google    │    │
│  │     Sign in with Google  │    │
│  └──────────────────────────┘    │
│                                  │
│                                  │
│     v1.0.0                       │
└──────────────────────────────────┘
```

**Components used**:
- `Surface` — full screen background (`className="flex-1 bg-background"`)
- `Button` — Google sign-in (`variant="solid" color="primary" size="lg"`)
- Standard `Image` — App logo
- Standard `Text` — Welcome text

**Behavior**:
- Single button triggers `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Loading spinner replaces button during auth flow.
- Error toast if auth fails.

### 4.2 Pending Approval Screen

```
┌──────────────────────────────────┐
│                                  │
│           ⏳                     │
│                                  │
│    החשבון שלך ממתין לאישור       │
│    Your account is pending       │
│    approval                      │
│                                  │
│    מנהל המערכת יאשר את            │
│    הגישה שלך בהקדם               │
│                                  │
│  ┌──────────────────────────┐    │
│  │    רענן   /   Refresh    │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │  התנתק  /  Sign out      │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

**Components**:
- `Surface` — background
- `Button` — Refresh (`variant="solid" color="primary"`) and Sign out (`variant="bordered" color="danger"`)

### 4.3 Surveyor Dashboard

```
┌──────────────────────────────────┐
│ ──── Top Safe Area ────          │
│                                  │
│  שלום, רומן 👋        ┌──┐      │
│  Hello, Roman          │🔔│      │
│                        └──┘      │
│ ┌──────────┐ ┌──────────┐       │
│ │ הושלמו   │ │ ממתינים  │       │
│ │ Completed │ │ Pending  │       │
│ │   12     │ │    5     │       │
│ └──────────┘ └──────────┘       │
│                                  │
│ ── הפרויקטים שלי ──              │
│ ── My Projects ──                │
│                                  │
│ ┌──────────────────────────┐    │
│ │ 📁  פרויקט סקר תשתיות   │    │
│ │     12 רשומות · 3 ממתינים│    │
│ │                    →     │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ 📁  פרויקט בדיקות       │    │
│ │     8 רשומות · 1 ממתין   │    │
│ │                    →     │    │
│ └──────────────────────────┘    │
│                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ [Home] [Projects] [Tasks] [Me]  │
└──────────────────────────────────┘
```

**Components**:
- `Surface` — screen container
- `Card` — KPI summary cards (2 in a row)
- `Card` — project cards with `PressableFeedback` for tap
- `Chip` — pending count badge
- `Separator` — section dividers
- `Skeleton` / `SkeletonGroup` — loading states

**Data**:
- KPIs: count of records where `assignee_id = currentUser.id` grouped by status.
- Projects: from `project_users` → `projects`, with record counts.

### 4.4 Manager Dashboard

```
┌──────────────────────────────────┐
│ ──── Top Safe Area ────          │
│                                  │
│  לוח בקרה           ┌────────┐  │
│  Dashboard           │Project▼│  │
│                      └────────┘  │
│ ┌─────┐┌─────┐┌─────┐┌─────┐   │
│ │סוקרים││היום ││שבוע ││אחוז ││  │
│ │  8  ││ 24  ││ 142 ││ 78% │   │
│ └─────┘└─────┘└─────┘└─────┘   │
│                                  │
│ ┌──────────────────────────┐    │
│ │   📊 Status Distribution │    │
│ │   [Pie Chart]            │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │   📈 Daily Volume        │    │
│ │   [Line Chart]           │    │
│ └──────────────────────────┘    │
│                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ [Dashboard][Projects][Reports][Me]│
└──────────────────────────────────┘
```

**Components**:
- `Select` — project filter dropdown
- `Card` — KPI cards (4 in scrollable row)
- `Card` — chart containers
- `Spinner` — loading state for charts
- `Skeleton` — placeholder for KPI cards

**Charts**: Use `react-native-chart-kit` or `victory-native` for pie/line charts (not HeroUI — no chart component exists). Charts render inside `Card` containers.

### 4.5 Project Detail

```
┌──────────────────────────────────┐
│ ← חזרה     פרויקט סקר תשתיות   │
│   Back                           │
│                                  │
│ ┌──────────────────────────┐    │
│ │ Tabs: [שאלונים] [רשומות] │    │
│ └──────────────────────────┘    │
│                                  │
│ ── Active tab: Records ──        │
│                                  │
│ ┌──────────────────────────┐    │
│ │ 🔍 Search    [Filter ▼]  │    │
│ └──────────────────────────┘    │
│                                  │
│ ┌──────────────────────────┐    │
│ │ #EXT-001  ● form_filled  │    │
│ │ רומן · 12/01/2026        │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ #EXT-002  ● in_progress  │    │
│ │ רומן · 11/01/2026        │    │
│ └──────────────────────────┘    │
│                                  │
│       ┌──────────────┐          │
│       │ + סקר חדש    │          │
│       │   New Survey │          │
│       └──────────────┘          │
│                                  │
└──────────────────────────────────┘
```

**Components**:
- `Tabs` — switch between Questionnaires and Records
- `Input` — search field
- `Select` — status filter
- `Card` + `PressableFeedback` — record cards
- `Chip` — status badge (color-coded)
- `Button` — floating "New Survey" (`variant="solid" color="primary" size="lg"`)

**Status badge colors**:
| Status | Color | Hebrew |
|--------|-------|--------|
| `not_started` | `default` (gray) | לא התחיל |
| `in_progress` | `warning` (amber) | בתהליך |
| `form_filled` | `success` (green) | מולא |
| `handled` | `secondary` (blue) | טופל |
| `sent_to_control` | `primary` (dark blue) | נשלח לבקרה |
| `passed_quality_control` | `success` (green, solid) | עבר בקרה |

### 4.6 Form Filling (Full-Screen Modal)

This is the most complex screen. It's where surveyors spend most of their time.

```
┌──────────────────────────────────┐
│ ✕ סגור      סקר תשתיות    שמור │
│   Close                    Save  │
│                                  │
│ ┌──────────────────────────────┐│
│ │ Section: [1][2][3][4]  2/4   ││
│ └──────────────────────────────┘│
│                                  │
│ ── Page 1 of 1 ──               │
│                                  │
│ ┌──────────────────────────┐    │
│ │ שם הנכס *                │    │
│ │ Property Name             │    │
│ │ ┌──────────────────────┐ │    │
│ │ │                      │ │    │
│ │ └──────────────────────┘ │    │
│ └──────────────────────────┘    │
│                                  │
│ ┌──────────────────────────┐    │
│ │ סוג נכס *               │    │
│ │ Property Type            │    │
│ │ ┌──────────────────────┐ │    │
│ │ │ Select...        ▼   │ │    │
│ │ └──────────────────────┘ │    │
│ └──────────────────────────┘    │
│                                  │
│ ┌──────────────────────────┐    │
│ │ צילום חזית *             │    │
│ │ Front Photo              │    │
│ │ ┌──────────────────────┐ │    │
│ │ │   📷 Tap to capture  │ │    │
│ │ └──────────────────────┘ │    │
│ └──────────────────────────┘    │
│                                  │
│  ┌───────────┐ ┌───────────┐    │
│  │ ← הקודם  │ │  הבא →   │    │
│  │   Prev    │ │   Next    │    │
│  └───────────┘ └───────────┘    │
│                                  │
│  On last section:               │
│  ┌──────────────────────────┐   │
│  │    שמור ושלח / Submit    │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

**Components**:
- `CloseButton` — top-left close (with "discard changes?" confirmation via `Dialog`)
- `Button` — Save draft (top-right, `variant="bordered"`)
- `Tabs` — section navigation (scrollable if many sections)
- `TextField` / `Input` — text questions
- `TextArea` — multiline text questions
- `Select` — single-select questions
- `Checkbox` group — multi-select questions
- `RadioGroup` — radio questions
- `Switch` — boolean questions
- `Button` — photo capture trigger
- `Button` — GPS capture trigger
- `Card` — question container wrapping each field
- `Label` — question text
- `Description` — help text
- `FieldError` — validation errors on required fields
- `Chip` — required indicator (`*`)
- `Dialog` — discard confirmation, page delete confirmation
- `Toast` — save success, validation error
- `Spinner` — photo upload progress
- `Accordion` — composite field groups

**Question type → HeroUI Native component mapping**:

| Question Type | Component(s) | Notes |
|--------------|-------------|-------|
| `text` | `TextField` + `Input` | Single line |
| `textarea` | `TextField` + `TextArea` | Multi-line |
| `number` | `TextField` + `Input` (keyboardType="numeric") | Numeric keyboard |
| `date` | `Button` → native DatePicker | Platform date picker |
| `time` | `Button` → native TimePicker | Platform time picker |
| `select` | `Select` | Dropdown with options from `options_json` |
| `multiSelect` | `Checkbox` group in `Card` | Multiple selection |
| `boolean` | `Switch` or `RadioGroup` (yes/no) | Toggle |
| `gps` | `Button` + Map preview | Captures coordinates |
| `photo` | `Button` + Image preview | Camera/gallery |
| `readonlyText` | `TextField` + `Input` (isReadOnly) | Disabled, auto-filled |
| `masterDataQuestion` | `Select` (searchable) | Options from `project_data` |
| `lookupAutofill` | `Select` + auto-populate | Fills other fields |
| `composite` | `Accordion` containing nested fields | Expandable group |

### 4.7 Record Detail (Manager View)

```
┌──────────────────────────────────┐
│ ← חזרה         #EXT-001         │
│                                  │
│ ┌──────────────────────────────┐│
│ │ Tabs: [נתונים][סטטוס][קבצים]││
│ │       [מיקום][הערות]         ││
│ └──────────────────────────────┘│
│                                  │
│ ── Data Tab ──                   │
│                                  │
│ ┌──────────────────────────┐    │
│ │ שם הנכס: בניין מרכזי     │    │
│ │ סוג: מגורים              │    │
│ │ [Photo thumbnail]        │    │
│ │ AI: { floors: 5, ... }   │    │
│ └──────────────────────────┘    │
│                                  │
│ ── Status Tab ──                 │
│ ┌──────────────────────────┐    │
│ │ ● form_filled  12:30     │    │
│ │ ● in_progress  11:00     │    │
│ │ ● not_started  10:45     │    │
│ └──────────────────────────┘    │
│                                  │
│ Manager action:                  │
│ ┌──────────────────────────┐    │
│ │ Change Status  [▼ Select]│    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ Add Note  [TextField]    │    │
│ └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

**Components**:
- `Tabs` — Data / Status / Files / Location / Notes
- `Card` — answer display cards
- `Separator` — between answer rows
- `Chip` — status badges in timeline
- `Select` — status change dropdown (manager only)
- `TextField` + `TextArea` — add note
- `Button` — submit status change / note

### 4.8 Profile Screen

```
┌──────────────────────────────────┐
│          הפרופיל שלי              │
│          My Profile               │
│                                  │
│         ┌────────┐               │
│         │ Avatar │               │
│         │  📷    │               │
│         └────────┘               │
│                                  │
│  ┌──────────────────────────┐   │
│  │ שם: רומן פוכטמן         │   │
│  │ אימייל: roman@...       │   │
│  │ טלפון: 050-1234567      │   │
│  │ מספר עובד: EMP-001      │   │
│  │ תפקיד: סוקר             │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  ✏️ עריכת פרופיל        │   │
│  │     Edit Profile          │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ סטטוס סנכרון: ✅ מסונכרן │   │
│  │ Sync status: Synced       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │  🚪 התנתק / Logout       │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

**Components**:
- `Avatar` — profile photo (tap to change)
- `Card` — info card with fields
- `Button` — edit profile, logout
- `Chip` — sync status indicator
- `BottomSheet` — edit profile form
- `TextField` — editable fields (phone)
- `Toast` — profile updated confirmation

---

## 5. Offline State UI

### 5.1 Offline Banner

When the device has no connectivity, show a persistent banner at the top of every screen:

```
┌──────────────────────────────────┐
│ 🔴 אין חיבור · שינויים נשמרים  │
│    No connection · Changes saved │
│    locally                       │
└──────────────────────────────────┘
```

**Component**: Custom composed from `Surface` + `Chip` with `color="warning"`. Shown conditionally via `NetInfo` listener.

### 5.2 Sync Status Indicator

On Profile screen and in the tab bar (subtle dot):

| State | Indicator | Color |
|-------|-----------|-------|
| All synced | ✅ | `success` |
| Pending uploads | 🔄 `N` items | `warning` |
| Sync error | ⚠️ Error | `danger` |
| Syncing now | `Spinner` | `primary` |

### 5.3 Photo Upload Queue

In form filling, photos show their upload status:

| State | UI |
|-------|-----|
| Captured (local) | Thumbnail + "📱 Saved locally" chip |
| Uploading | Thumbnail + `Spinner` + progress % |
| Uploaded | Thumbnail + ✅ chip |
| Upload failed | Thumbnail + ⚠️ "Retry" button |

---

## 6. Loading States

Every data-fetching screen uses `Skeleton` / `SkeletonGroup` from HeroUI Native:

| Screen | Skeleton Pattern |
|--------|-----------------|
| Dashboard KPIs | 2 or 4 skeleton rectangles in a row |
| Project list | 3 skeleton cards stacked |
| Record list | 5 skeleton rows |
| Record detail | Skeleton text lines + skeleton image |
| Form questions | Skeleton input fields |

No raw `Spinner` in content areas. `Spinner` only for:
- Button loading state (`isLoading` prop)
- Pull-to-refresh indicator
- Photo upload progress

---

## 7. Empty States

Each list screen has an empty state with illustration and action:

| Screen | Message | Action |
|--------|---------|--------|
| Projects (none assigned) | "אין פרויקטים מוקצים" (No assigned projects) | Contact admin |
| Records (none) | "אין רשומות עדיין" (No records yet) | "New Survey" button |
| Tasks (none pending) | "אין משימות ממתינות" (No pending tasks) | Celebration icon |
| Reports (no data) | "אין נתונים להצגה" (No data to display) | Adjust filters |

**Component**: Custom composed from `Surface` + `Text` + `Button`. Centered vertically.

---

## 8. Interaction Patterns

### 8.1 Pull-to-Refresh
All list screens and dashboard support pull-to-refresh to trigger data sync.

### 8.2 Swipe Actions
Record cards in surveyor view support swipe-to-reveal actions:
- Swipe left: "Resume" (for in_progress) or "View" (for completed)
- Implemented via `react-native-gesture-handler` Swipeable.

### 8.3 Confirmation Dialogs
Using HeroUI Native `Dialog` for destructive actions:
- Close form without saving → "Discard changes?"
- Delete page → "Delete page N?"
- Logout → "Are you sure?"

### 8.4 Toast Notifications
Using HeroUI Native `Toast` for feedback:
- Success: "Record saved", "Profile updated", "Sync complete"
- Error: "Failed to save", "Upload error"
- Warning: "Required fields missing"

### 8.5 Bottom Sheets
Using `BottomSheet` for:
- Edit profile form
- Filter options on record list
- Status change + comment form (manager)
- Questionnaire selection when creating new record

---

## 9. Accessibility

- All interactive elements have `accessibilityLabel` in Hebrew.
- `accessibilityRole` set correctly (button, link, header, etc.).
- Minimum touch target: 44×44 pt (enforced by HeroUI Native defaults).
- Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for large text).
- VoiceOver (iOS) and TalkBack (Android) tested for all flows.
- No color-only indicators: status badges include text labels, not just color dots.

---

## 10. Self-Check

- [x] HeroUI Native components used exclusively — no custom primitives
- [x] Every screen has ASCII wireframe with component mapping
- [x] Question types mapped to specific HeroUI components
- [x] RTL handled via logical properties throughout
- [x] Offline states have dedicated UI patterns
- [x] Loading states use Skeleton, not Spinner
- [x] Empty states defined for all list screens
- [x] Color tokens match web platform branding
- [x] Navigation structure defined for both roles
- [x] Interaction patterns (swipe, pull, dialog, toast, bottom sheet) specified
- [x] Accessibility requirements stated
- [x] Status badge colors defined
- [x] Form filling screen (most complex) fully specified
- [x] Cross-references: component list matches CLAUDE.md directory structure
