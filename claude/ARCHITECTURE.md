# ARCHITECTURE.md — Datrix Mobile Technical Architecture

> System architecture, data flow, offline sync, authentication, and integration design.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Datrix Mobile App                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Expo     │  │ HeroUI   │  │ React    │  │ Zustand  │   │
│  │  Router   │  │ Native   │  │ Query    │  │ Stores   │   │
│  └────┬─────┘  └──────────┘  └────┬─────┘  └────┬─────┘   │
│       │                           │              │          │
│  ┌────┴───────────────────────────┴──────────────┴─────┐   │
│  │              API Layer (src/api/)                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Entity Hooks │  │ Auth Module │  │ Storage API │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  └─────────┼────────────────┼────────────────┼──────────┘   │
│            │                │                │              │
│  ┌─────────┴────────────────┴────────────────┴──────────┐   │
│  │              WatermelonDB (Local Database)             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ Records  │  │ Answers  │  │ Sync     │           │   │
│  │  │ Questions│  │ Files    │  │ Metadata │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ Sync Engine                       │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┼───────────────────────────────────┐
│                   Supabase Backend                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PostgREST│  │   Auth   │  │ Storage  │  │  Edge    │   │
│  │ (Tables) │  │ (OAuth)  │  │ (Files)  │  │ Functions│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL (25 shared tables)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Project Setup

### 2.1 Expo Configuration

The app uses Expo SDK 52+ with Expo Router v4 for file-based routing.

**app.json** key fields:
```json
{
  "expo": {
    "name": "Datrix",
    "slug": "datrix-mobile",
    "scheme": "datrix",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-camera",
      "expo-location",
      "expo-image-picker",
      "expo-notifications",
      ["expo-build-properties", {
        "android": { "minSdkVersion": 24 },
        "ios": { "deploymentTarget": "15.0" }
      }]
    ],
    "extra": {
      "SUPABASE_URL": "https://zbtjfjflfvtsoctubtnx.supabase.co",
      "SUPABASE_ANON_KEY": "ENV_VAR"
    }
  }
}
```

### 2.2 EAS Build Configuration

**eas.json**:
```json
{
  "build": {
    "development": {
      "distribution": "internal",
      "developmentClient": true,
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "APP_ENV": "preview" }
    },
    "production": {
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "CONFIGURE", "ascAppId": "CONFIGURE" },
      "android": { "serviceAccountKeyPath": "CONFIGURE" }
    }
  }
}
```

---

## 3. Authentication Architecture

### 3.1 Auth Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  App     │    │  Supabase    │    │  Google      │    │  Supabase    │
│  Launch  │───▶│  getSession()│───▶│  OAuth       │───▶│  DB Trigger  │
│          │    │              │    │  (if needed) │    │  (provision) │
└──────────┘    └──────┬───────┘    └──────────────┘    └──────┬───────┘
                       │                                       │
                       ▼                                       ▼
                ┌──────────────┐                        ┌──────────────┐
                │  Fetch       │                        │  app_users   │
                │  app_users   │◀───────────────────────│  row ready   │
                │  profile     │                        │              │
                └──────┬───────┘                        └──────────────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
     ┌──────────┐ ┌────────┐ ┌────────────┐
     │ Active   │ │Inactive│ │ No profile │
     │ → Route  │ │→ Pend. │ │ → Error    │
     │ by role  │ │ Screen │ │            │
     └──────────┘ └────────┘ └────────────┘
```

### 3.2 Supabase Client Initialization

```typescript
// src/api/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;

// Secure token storage for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
});
```

### 3.3 OAuth in React Native

Google OAuth in Expo uses `expo-auth-session` + `expo-web-browser`:

1. App opens Google consent screen via system browser.
2. User authenticates with Google.
3. Google redirects to `datrix://auth-callback` (deep link).
4. Expo captures the redirect, extracts tokens.
5. Supabase `signInWithIdToken()` exchanges the Google token for a Supabase session.

This avoids the web-based `signInWithOAuth()` redirect flow that doesn't work in React Native.

### 3.4 AuthProvider

```typescript
// src/auth/AuthProvider.tsx
// Wraps the entire app. Provides:
// - user: AppUser | null (profile from app_users)
// - session: Session | null (Supabase auth session)
// - isLoading: boolean
// - isAuthenticated: boolean
// - login(): Promise<void> (triggers Google OAuth)
// - logout(): Promise<void> (clears session + local DB)
// - refreshUser(): Promise<void> (re-fetches app_users)
```

### 3.5 Role Routing

The root `app/index.tsx` reads `user.role` and redirects:

| Role | Route Group | Tab Layout |
|------|------------|------------|
| `surveyor` | `(surveyor)` | Home, Projects, Tasks, Profile |
| `manager` | `(manager)` | Dashboard, Projects, Reports, Profile |
| `viewer` | `(manager)` | Same as manager (read-only enforced per-feature) |
| `owner` | `(manager)` | Same as manager |
| `admin` | `(manager)` | Admin functions are web-only; uses manager view |

---

## 4. State Management Architecture

### 4.1 Three-Layer State Model

```
┌───────────────────────────────────────────────┐
│                UI Components                   │
│  (local state for forms, modals, UI toggles)  │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────┼────────────────────────┐
│           Zustand Stores (Client State)        │
│  ┌─────────────┐  ┌─────────────┐             │
│  │ syncStore   │  │ draftStore  │             │
│  │ - isOnline  │  │ - unsaved   │             │
│  │ - pending   │  │   answers   │             │
│  │ - lastSync  │  │ - current   │             │
│  │ - errors    │  │   recordId  │             │
│  └─────────────┘  └─────────────┘             │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────┼────────────────────────┐
│         React Query (Server State Cache)       │
│  - queryKey-based caching                      │
│  - Background refetch on reconnect             │
│  - Mutations with optimistic updates           │
│  - Offline mutation queue (via persistor)      │
└──────────────────────┬────────────────────────┘
                       │
┌──────────────────────┼────────────────────────┐
│         WatermelonDB (Offline Persistence)      │
│  - SQLite on device                            │
│  - Syncs with Supabase via pull/push           │
│  - Source of truth when offline                │
└───────────────────────────────────────────────┘
```

### 4.2 Zustand Stores

**syncStore**: Global connectivity and sync state.
```typescript
interface SyncStore {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncErrors: SyncError[];
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  setOnline: (online: boolean) => void;
}
```

**draftStore**: Current form-filling session state.
```typescript
interface DraftStore {
  activeRecordId: string | null;
  activePage: number;
  unsavedAnswers: Record<string, AnswerValue>;
  photoQueue: PhotoUploadItem[];
  setAnswer: (questionId: string, value: AnswerValue) => void;
  clearDraft: () => void;
}
```

### 4.3 React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min stale time
      gcTime: 30 * 60 * 1000,          // 30 min garbage collection
      retry: 2,
      refetchOnReconnect: true,        // Re-fetch when back online
      networkMode: 'offlineFirst',     // Use cache first
    },
    mutations: {
      networkMode: 'offlineFirst',     // Queue mutations offline
      retry: 3,
    },
  },
});
```

---

## 5. API Layer

### 5.1 Entity Hook Pattern

Every entity has a dedicated hook file following this pattern:

```typescript
// src/api/hooks/useRecords.ts

// Case conversion utilities
import { snakeToCamel, camelToSnake } from '../caseUtils';

// Type definitions
export interface Record {
  id: string;
  projectId: string;
  questionnaireId: string;
  assigneeId: string;
  externalId: string;
  serialNumber: string;
  status: RecordStatus;
  hasQuestionnaire: boolean;
  area: string;
  category: string;
  locationInfo: string;
  colorTag: string;
  color: string;
  startTime: string;
  endTime: string;
  processedAt: string;
  createdDate: string;
  updatedAt: string;
}

// Query hooks
export function useRecords(filters?: { projectId?: string; assigneeId?: string }) {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: async () => {
      let query = supabase.from('records').select('*');
      if (filters?.projectId) query = query.eq('project_id', filters.projectId);
      if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId);
      const { data, error } = await query.order('created_date', { ascending: false });
      if (error) throw error;
      return data.map(snakeToCamel) as Record[];
    },
  });
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: ['records', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('records').select('*').eq('id', id).single();
      if (error) throw error;
      return snakeToCamel(data) as Record;
    },
    enabled: !!id,
  });
}

// Mutation hooks
export function useCreateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Partial<Record>) => {
      const { data, error } = await supabase.from('records').insert(camelToSnake(record)).select().single();
      if (error) throw error;
      return snakeToCamel(data) as Record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}
```

### 5.2 Case Conversion

Reuse the same logic as the web app:

```typescript
// src/api/caseUtils.ts
export function snakeToCamel(row: any): any { /* ... */ }
export function camelToSnake(row: any): any { /* ... */ }
```

Database uses `snake_case`. TypeScript uses `camelCase`. Conversion happens at the API boundary — components never see snake_case.

### 5.3 Edge Function Invocation

```typescript
// src/api/integrations.ts

export async function uploadFile(file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

  const filePath = `records/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage.from('main').upload(filePath, formData);
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('main').getPublicUrl(filePath);
  return publicUrl;
}

export async function invokeLLM(params: {
  prompt: string;
  fileUrls?: string[];
  responseJsonSchema?: object;
}) {
  const { data, error } = await supabase.functions.invoke('invoke-llm', { body: params });
  if (error) throw error;
  return data;
}

export async function sendPushNotification(params: {
  pushToken: string;
  title: string;
  body: string;
}) {
  const { data, error } = await supabase.functions.invoke('send-push', { body: params });
  if (error) throw error;
  return data;
}
```

---

## 6. Offline Architecture

### 6.1 Strategy: Local-First with Background Sync

The app follows a **local-first** architecture for survey data:

1. **Reads**: Components read from React Query cache (populated from WatermelonDB or Supabase).
2. **Writes**: Mutations write to WatermelonDB immediately, then queue for Supabase sync.
3. **Sync**: Background sync engine pushes local changes and pulls remote changes.

```
┌─────────────────────────────────────────────┐
│                    Component                 │
│  useRecords() → React Query → WatermelonDB  │
│  createRecord() → WatermelonDB → Sync Queue │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────┼───────────────────────┐
│              Sync Engine                     │
│                                              │
│  ┌─────────┐    ┌──────────┐    ┌────────┐ │
│  │ Pull    │    │ Push     │    │ Resolve│ │
│  │ Remote  │───▶│ Local    │───▶│ Queue  │ │
│  │ Changes │    │ Changes  │    │        │ │
│  └─────────┘    └──────────┘    └────────┘ │
│       ▲              │                      │
│       │              ▼                      │
│  ┌─────────────────────────────────────┐   │
│  │            Supabase API              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 6.2 WatermelonDB Schema

WatermelonDB mirrors the Supabase tables needed offline:

**Synced tables** (available offline):
- `records` — survey responses
- `record_answers` — question answers
- `record_pages` — multi-page form data
- `record_files` — file metadata (not the file itself)
- `record_locations` — GPS coordinates
- `record_notes` — comments
- `record_status_history` — status audit trail
- `questionnaires` — form templates
- `questions` — form fields
- `projects` — project metadata
- `project_users` — user-project assignments
- `project_data` — master data for offline lookups
- `categories` — record categories
- `areas` — geographic areas

**Not synced** (online-only):
- `app_users` — fetched on login, stored in auth context
- `clients` — not needed on mobile
- `activity_logs` — written to Supabase directly (no offline logging)
- `ai_analysis_reports` — online-only feature
- `report_*` — online-only features
- `import_*` — web-only features

### 6.3 Sync Engine Design

```typescript
// src/db/sync.ts

interface SyncConfig {
  pullInterval: 5 * 60 * 1000;  // Pull every 5 minutes when online
  pushDebounce: 3 * 1000;        // Push 3 seconds after last write
  maxRetries: 5;
  retryBackoff: 'exponential';   // 1s, 2s, 4s, 8s, 16s
}

// Sync lifecycle:
// 1. On app start → full pull (all data for assigned projects)
// 2. On write → debounced push (3s after last write)
// 3. On reconnect → immediate pull + push
// 4. Periodic → pull every 5 minutes while online
// 5. On app foreground → pull
```

**Pull strategy**:
- Use `updated_at` timestamp for incremental sync.
- Store `lastPulledAt` per table in WatermelonDB metadata.
- Query: `SELECT * FROM records WHERE updated_at > $lastPulledAt AND project_id IN ($assignedProjects)`

**Push strategy**:
- WatermelonDB tracks dirty records (created/updated/deleted locally).
- Push sends all dirty records to Supabase via upsert.
- On success, mark records as synced.
- On conflict (same record updated remotely), **server wins** for status fields, **local wins** for answer data.

**Conflict resolution**:
- No concurrent editing by design (only the surveyor edits their own records).
- Manager status changes may overlap with surveyor edits, but they touch different columns.
- If a true conflict occurs, prefer the most recent `updated_at` timestamp.

### 6.4 Photo Offline Handling

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Capture  │───▶│ Save to      │───▶│ Add to       │───▶│ Upload when  │
│ Photo    │    │ app's file   │    │ upload queue │    │ online       │
│          │    │ directory    │    │ (Zustand)    │    │              │
└──────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │ Store URL in │
                                                        │ record_files │
                                                        │ + run AI if  │
                                                        │ enabled      │
                                                        └──────────────┘
```

- Photos saved to `FileSystem.documentDirectory` (persists across app restarts).
- Upload queue stored in Zustand (persisted to AsyncStorage).
- Queue processed FIFO when online.
- Failed uploads retry with exponential backoff.
- Local file deleted only after successful upload + sync confirmation.

---

## 7. Navigation Architecture

### 7.1 Expo Router File Structure

```
app/
├── _layout.tsx           ← Root: Providers (Auth, Query, HeroUI, GestureHandler)
├── index.tsx             ← Entry: Check auth → redirect by role
├── (auth)/
│   ├── _layout.tsx       ← Stack navigator (no tabs)
│   ├── login.tsx
│   └── pending-approval.tsx
├── (surveyor)/
│   ├── _layout.tsx       ← Tab navigator (4 tabs)
│   ├── index.tsx         ← Dashboard
│   ├── projects/
│   │   ├── index.tsx     ← Project list
│   │   └── [projectId]/
│   │       ├── index.tsx ← Project detail (tabs: questionnaires, records)
│   │       └── records/
│   │           ├── new.tsx       ← Select questionnaire → create record
│   │           └── [recordId]/
│   │               └── fill.tsx  ← Form filling (presented as modal)
│   ├── tasks.tsx         ← Pending records across all projects
│   └── profile.tsx       ← User profile
├── (manager)/
│   ├── _layout.tsx       ← Tab navigator (4 tabs)
│   ├── index.tsx         ← KPI Dashboard
│   ├── projects/
│   │   ├── index.tsx     ← All projects
│   │   └── [projectId]/
│   │       ├── index.tsx ← Project detail (records, team)
│   │       └── records/
│   │           └── [recordId].tsx  ← Record detail (tabs: data, status, files, location, notes)
│   ├── reports.tsx       ← Report summaries, export
│   └── profile.tsx       ← User profile
└── +not-found.tsx        ← 404
```

### 7.2 Navigation Guards

The root `_layout.tsx` wraps all routes with auth checking:

```
App Start
  │
  ├─ No session → Redirect to (auth)/login
  │
  ├─ Session + inactive user → Redirect to (auth)/pending-approval
  │
  ├─ Session + active + surveyor → Redirect to (surveyor)/
  │
  └─ Session + active + manager/viewer/owner/admin → Redirect to (manager)/
```

Guards run on every navigation event (not just app start) to handle session expiry.

---

## 8. Push Notification Architecture

### 8.1 Registration Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ App Start│───▶│ Request      │───▶│ Store token  │
│ (after   │    │ notification │    │ in app_users │
│  login)  │    │ permission   │    │ push_token   │
└──────────┘    └──────────────┘    └──────────────┘
```

1. After successful login, request notification permission via `expo-notifications`.
2. Get Expo push token via `Notifications.getExpoPushTokenAsync()`.
3. Store token in `app_users.push_token` column.
4. Token refreshes on each app start.

### 8.2 Notification Triggers

Notifications sent via Supabase Edge Function (`send-push`):

| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| New questionnaire assigned | Surveyor | "שאלון חדש" | "שאלון {name} הוקצה אליך" |
| Record returned for revision | Surveyor | "רשומה הוחזרה" | "רשומה #{id} דורשת תיקון" |
| Record submitted | Manager | "רשומה חדשה" | "{surveyor} שלח רשומה ב{project}" |
| Sync error | User | "שגיאת סנכרון" | "X רשומות לא סונכרנו" |

### 8.3 Edge Function for Push

A new Supabase Edge Function `send-push` uses the Expo Push API:

```
POST https://exp.host/--/api/v2/push/send
{
  "to": "ExponentPushToken[xxx]",
  "title": "שאלון חדש",
  "body": "שאלון בדיקות הוקצה אליך",
  "data": { "screen": "projects/abc123" }
}
```

The `data.screen` field enables deep linking when the notification is tapped.

---

## 9. Security Architecture

### 9.1 Authentication
- Google OAuth only (no password storage).
- Supabase manages JWT tokens with auto-refresh.
- Tokens stored in `expo-secure-store` (Keychain on iOS, Keystore on Android).
- No sensitive data in AsyncStorage.

### 9.2 Authorization (RLS)
- Current state: Permissive RLS (Phase 1, all authenticated users have full CRUD).
- **Phase 2 target** (to be implemented on web and mobile simultaneously):
  - Surveyors: Read own records + assigned project data. Write own records/answers.
  - Managers: Read all project records. Write status changes and notes.
  - Helper functions `get_user_role()` and `get_app_user_id()` already exist in DB.

### 9.3 Data at Rest
- WatermelonDB uses SQLite (unencrypted by default).
- For sensitive deployments, enable SQLite encryption via `SQLCipher` (WatermelonDB supports this).
- Photos stored in app's private file directory (not accessible to other apps).

### 9.4 Network Security
- All Supabase communication over HTTPS.
- Certificate pinning: Not implemented for v1 (Supabase uses standard TLS).
- API key is the anon key (public, safe for client-side use with RLS enforcing access).

---

## 10. Performance Considerations

### 10.1 Bundle Size
- Use granular HeroUI Native imports (`heroui-native/button` not `heroui-native`).
- Tree-shake unused components.
- Target: <20MB initial bundle.

### 10.2 List Performance
- Use `FlashList` (from `@shopify/flash-list`) instead of `FlatList` for record lists.
- Estimated item size for skip layout calculation.
- No more than 100 items loaded at once; paginate locally from WatermelonDB.

### 10.3 Image Performance
- Photos compressed to ≤2MB before local storage.
- Thumbnails generated on device for list views (50×50px).
- Full images loaded on-demand in detail views.
- Use `expo-image` for optimized image loading with caching.

### 10.4 Startup Performance
- Target: <3s cold start on mid-range device.
- Defer non-critical data fetches (reports, team stats) to after first render.
- Splash screen shows while auth session loads.

---

## 11. Error Handling Strategy

### 11.1 Error Levels

| Level | Example | Handling |
|-------|---------|----------|
| **Fatal** | Auth session corrupt | Force logout, clear data, restart |
| **Recoverable** | API call failed | Retry with backoff, show toast |
| **User** | Required field empty | Inline validation, field error |
| **Silent** | Background sync retry | Log only, no UI |

### 11.2 Error Boundary

React error boundary at each route group level:

```
app/_layout.tsx          → Global error boundary (fatal: restart button)
app/(surveyor)/_layout.tsx → Tab group boundary (recoverable: retry button)
app/(manager)/_layout.tsx  → Tab group boundary (recoverable: retry button)
```

### 11.3 Crash Reporting

Use `expo-updates` OTA updates for rapid fixes + Sentry or similar for crash reporting.

---

## 12. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Jest | Utility functions, case conversion, sync logic |
| Component | React Native Testing Library | Individual components, form fields |
| Integration | React Native Testing Library | Full flows (login → fill form → submit) |
| E2E | Maestro | Critical paths on real devices |

---

## 13. Self-Check

- [x] System overview diagram shows all layers
- [x] Supabase client configuration handles React Native specifics (SecureStore, no URL detection)
- [x] OAuth flow uses expo-auth-session (not web redirect)
- [x] Three-layer state model (local, Zustand, React Query, WatermelonDB) clearly defined
- [x] API layer with typed hooks and case conversion
- [x] Offline architecture with pull/push sync engine
- [x] Photo offline handling with queue
- [x] Navigation structure matches Expo Router file conventions
- [x] Push notification flow end-to-end
- [x] Security covers auth, authorization, data-at-rest, network
- [x] Performance targets stated
- [x] Error handling strategy with levels
- [x] Cross-references: navigation matches DESIGN.md, entities match DATABASE.md
