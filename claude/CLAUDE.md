# CLAUDE.md — Datrix Mobile App

> Instructions for AI assistants building and maintaining the Datrix mobile application.

## Project Identity

- **Name**: Datrix Mobile
- **Purpose**: Mobile companion to the Datrix web platform for survey data collection and project monitoring
- **Monorepo path**: `/mobile` (sibling to root web app)
- **Language**: TypeScript (strict mode)
- **Platform**: iOS + Android via React Native + Expo (SDK 52+)
- **UI Framework**: HeroUI Native (`heroui-native@^1.0.0-beta.13`)
- **Backend**: Supabase (shared instance with web app at `https://zbtjfjflfvtsoctubtnx.supabase.co`)

## Tech Stack (Exact Versions)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | SDK 52+ |
| Runtime | React Native | 0.76+ |
| Language | TypeScript | 5.x (strict) |
| UI Components | heroui-native | ^1.0.0-beta.13 |
| Styling | Uniwind (Tailwind v4 for RN) | latest |
| Navigation | Expo Router (file-based) | v4 |
| State (server) | TanStack React Query | v5 |
| State (client) | Zustand | v5 |
| Auth | Supabase Auth (@supabase/supabase-js) | v2 |
| Database | Supabase (PostgREST) | shared instance |
| Storage | Supabase Storage | shared buckets |
| Offline DB | WatermelonDB | latest |
| Maps | react-native-maps | latest |
| Camera | expo-camera + expo-image-picker | latest |
| Location | expo-location | latest |
| Push Notifications | expo-notifications + Supabase Edge Function | latest |
| Animations | react-native-reanimated | ~4.1.x |
| Gestures | react-native-gesture-handler | ^2.28 |
| Bottom Sheets | @gorhom/bottom-sheet | ^5 |

## Directory Structure

```
mobile/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Auth screens (unauthenticated)
│   │   ├── login.tsx
│   │   └── pending-approval.tsx
│   ├── (surveyor)/               # Surveyor tab group
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Dashboard
│   │   ├── projects/
│   │   │   ├── index.tsx         # My projects list
│   │   │   └── [projectId]/
│   │   │       ├── index.tsx     # Project detail
│   │   │       └── records/
│   │   │           ├── [recordId]/
│   │   │           │   └── fill.tsx   # Form filling
│   │   │           └── new.tsx        # Create record
│   │   └── profile.tsx           # User profile
│   ├── (manager)/                # Manager tab group
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard with KPIs
│   │   ├── projects/
│   │   │   ├── index.tsx
│   │   │   └── [projectId]/
│   │   │       ├── index.tsx
│   │   │       ├── records/
│   │   │       │   └── [recordId].tsx  # Record detail
│   │   │       └── team.tsx
│   │   ├── reports.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx               # Root layout (providers)
│   └── index.tsx                 # Entry redirect by role
├── src/
│   ├── api/
│   │   ├── supabase.ts           # Supabase client init
│   │   ├── entities.ts           # Entity CRUD helpers (typed)
│   │   └── hooks/                # React Query hooks per entity
│   │       ├── useRecords.ts
│   │       ├── useProjects.ts
│   │       ├── useQuestions.ts
│   │       └── ...
│   ├── auth/
│   │   ├── AuthProvider.tsx      # Auth context + session management
│   │   └── useAuth.ts           # Auth hook
│   ├── components/
│   │   ├── forms/                # Survey form components
│   │   │   ├── QuestionRenderer.tsx
│   │   │   ├── fields/           # Per question-type field components
│   │   │   │   ├── TextField.tsx
│   │   │   │   ├── NumberField.tsx
│   │   │   │   ├── SelectField.tsx
│   │   │   │   ├── PhotoField.tsx
│   │   │   │   ├── GPSField.tsx
│   │   │   │   ├── CompositeField.tsx
│   │   │   │   └── MasterDataField.tsx
│   │   │   ├── SectionNavigator.tsx
│   │   │   └── FormProgress.tsx
│   │   ├── records/
│   │   │   ├── RecordCard.tsx
│   │   │   ├── RecordStatusBadge.tsx
│   │   │   └── RecordList.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ProjectStats.tsx
│   │   ├── dashboard/
│   │   │   ├── KPICard.tsx
│   │   │   └── ChartCard.tsx
│   │   └── shared/
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       └── OfflineBanner.tsx
│   ├── db/                       # WatermelonDB offline layer
│   │   ├── schema.ts
│   │   ├── models/
│   │   └── sync.ts              # Supabase ↔ WatermelonDB sync
│   ├── lib/
│   │   ├── constants.ts
│   │   ├── types.ts             # Shared TypeScript types
│   │   └── utils.ts
│   └── theme/
│       └── global.css           # HeroUI Native + Uniwind theme
├── assets/                      # Static images, fonts
├── app.json                     # Expo config
├── tsconfig.json
├── package.json
└── eas.json                     # EAS Build config
```

## Coding Conventions

### Naming
- **Files**: `PascalCase.tsx` for components, `camelCase.ts` for utilities/hooks
- **Components**: Named exports, PascalCase (`export function ProjectCard()`)
- **Hooks**: `use` prefix (`useProjects`, `useAuth`, `useOfflineSync`)
- **Types**: PascalCase, suffix with purpose (`ProjectRow`, `RecordInsert`, `QuestionType`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config objects

### Database ↔ JS Naming
- **Database columns**: `snake_case` (e.g., `project_id`, `created_date`, `is_active`)
- **TypeScript properties**: `camelCase` (e.g., `projectId`, `createdDate`, `isActive`)
- Conversion happens in the API layer via `snakeToCamel` / `camelToSnake` utilities
- **Exception**: `created_date` and `updated_at` may appear as-is in some contexts for compatibility

### Styling
- Use Uniwind utility classes via `className` prop on HeroUI Native components
- Use `tailwind-variants` (`tv()`) for component variant definitions
- Use `cn()` for class merging with conflict resolution
- Never use inline `style` objects unless required by a third-party library
- RTL: Use logical properties (`ps-4` not `pl-4`, `ms-2` not `ml-2`)

### State Management
- **Server state**: TanStack React Query exclusively (no manual fetch + useState)
- **Client state**: Zustand stores for cross-screen state (active project, sync status, draft answers)
- **Form state**: React Hook Form or local component state for survey answers
- **Auth state**: Dedicated AuthProvider context

### Error Handling
- All Supabase calls must check `.error` before using `.data`
- Use React Query's `onError` for toast notifications
- Use ErrorBoundary at route group level
- Never swallow errors silently

## Key Patterns

### Entity CRUD
```typescript
// All entity access goes through typed hooks
const { data: records, isLoading } = useRecords({ projectId });
const createRecord = useCreateRecord();
const updateRecord = useUpdateRecord();

// Hooks wrap Supabase queries with case conversion
// See src/api/hooks/ for all entity hooks
```

### Offline-First
```typescript
// WatermelonDB for local persistence
// Sync engine pulls/pushes changes to Supabase
// All reads go through WatermelonDB (local-first)
// Writes queue to sync when online
// See src/db/sync.ts and ARCHITECTURE.md §6
```

### HeroUI Native Components
```typescript
// Always import from heroui-native (granular for tree-shaking)
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Input } from 'heroui-native/input';

// Never build custom design-system primitives
// Use HeroUI Native components for ALL UI elements
// See DESIGN.md for component mapping
```

## Related Documentation
- [PRD.md](./PRD.md) — Product requirements, user flows, feature specs
- [DESIGN.md](./DESIGN.md) — UI/UX specification, screen designs, component mapping
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture, offline sync, auth
- [DATABASE.md](./DATABASE.md) — Schema, RLS policies, mobile-specific queries
- [TASKS.md](./TASKS.md) — Implementation phases and task breakdown

## Critical Rules

1. **Never bypass TypeScript strict mode.** No `any` types, no `@ts-ignore`.
2. **Never create custom UI primitives.** Use HeroUI Native for everything. If a component doesn't exist, compose from existing ones.
3. **Never access Supabase directly from components.** Always go through the API hooks layer.
4. **Never store secrets in code.** Use Expo's env config (`app.json` extras or `.env` via expo-constants).
5. **Always handle offline state.** Every write operation must work offline and sync later.
6. **Always use logical RTL properties** for spacing/alignment. The app serves Hebrew-speaking users.
7. **Keep the shared Supabase schema intact.** The mobile app reads/writes the same tables as the web app. Never create mobile-only tables without explicit approval.
8. **Test on both platforms.** Every PR must be verified on iOS and Android.

## Self-Check
- [x] Tech stack pinned to specific versions
- [x] Directory structure matches Expo Router conventions
- [x] Naming conventions cover files, components, DB columns
- [x] HeroUI Native enforcement is explicit
- [x] Offline-first pattern documented
- [x] RTL requirement stated
- [x] Shared backend constraint is clear
- [x] Cross-references to all sibling docs
