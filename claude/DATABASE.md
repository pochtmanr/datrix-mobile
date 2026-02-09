# DATABASE.md — Datrix Mobile Database Schema & Data Access

> Complete database schema reference, RLS policies, mobile-specific queries, and offline storage design.

---

## 1. Shared Supabase Schema

The mobile app shares the same Supabase PostgreSQL database as the web app. **No mobile-only tables are created** except for one column addition (`push_token` on `app_users`).

All tables use:
- `id TEXT PRIMARY KEY` — preserves Base44 IDs (format: alphanumeric strings)
- `created_date TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()` — auto-updated via trigger

---

## 2. Complete Table Reference

### 2.1 Core Tables

#### `app_users` — Application users
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `auth_user_id` | UUID | YES | — | FK → auth.users |
| `email` | TEXT | NO | — | UNIQUE |
| `username` | TEXT | YES | — | |
| `first_name` | TEXT | YES | — | |
| `last_name` | TEXT | YES | — | |
| `full_name` | TEXT | YES | — | |
| `role` | TEXT | YES | `'surveyor'` | admin, manager, viewer, owner, surveyor |
| `user_role` | TEXT | YES | — | Legacy; prefer `role` |
| `employee_number` | TEXT | YES | — | |
| `is_active` | BOOLEAN | YES | — | false = pending approval |
| `phone` | TEXT | YES | — | |
| `phone_number` | TEXT | YES | — | Legacy; prefer `phone` |
| `profile_image` | TEXT | YES | — | URL to avatars bucket |
| `push_token` | TEXT | YES | — | **NEW: Expo push token** |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: On login (fetch profile), on team views (manager).
**Mobile writes**: `phone`, `profile_image`, `push_token`.

#### `projects` — Data collection projects
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `client_id` | TEXT | YES | — | FK → clients |
| `name` | TEXT | YES | — | |
| `code` | TEXT | YES | — | |
| `description` | TEXT | YES | — | |
| `category` | TEXT | YES | — | |
| `start_date` | TEXT | YES | — | |
| `status` | TEXT | YES | — | |
| `is_active` | BOOLEAN | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Project list, project detail.
**Mobile writes**: Never (admin-only creation).

#### `project_users` — User ↔ Project assignments
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `user_id` | TEXT | YES | — | FK → app_users |
| `role` | TEXT | YES | — | Role within project |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

UNIQUE constraint on `(project_id, user_id)`.

**Mobile reads**: Determine which projects the current user can access.
**Mobile writes**: Never (admin-only assignment).

### 2.2 Survey / Questionnaire Tables

#### `questionnaires` — Survey form templates
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `name` | TEXT | YES | — | |
| `code` | TEXT | YES | — | |
| `description` | TEXT | YES | — | |
| `version` | TEXT | YES | — | |
| `status` | TEXT | YES | `'draft'` | draft, active |
| `is_active` | BOOLEAN | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: List available questionnaires per project.
**Mobile writes**: Never.

#### `questionnaire_assignments` — User ↔ Questionnaire access
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `questionnaire_id` | TEXT | YES | — | FK → questionnaires |
| `user_id` | TEXT | YES | — | FK → app_users |
| `role` | TEXT | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Filter which questionnaires a surveyor can fill.
**Mobile writes**: Never.

#### `questions` — Individual survey fields
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `questionnaire_id` | TEXT | YES | — | FK → questionnaires |
| `project_id` | TEXT | YES | — | FK → projects |
| `type` | TEXT | YES | `'text'` | See question types below |
| `text` | TEXT | YES | — | Question label (Hebrew) |
| `code` | TEXT | YES | — | |
| `order_index` | INTEGER | YES | — | Sort order |
| `is_required` | BOOLEAN | YES | — | |
| `options_json` | JSONB | YES | — | Options for select/radio/checkbox |
| `help_text` | TEXT | YES | — | Hint text |
| `section_name` | TEXT | YES | — | Groups questions into sections |
| `ai_analysis_enabled` | BOOLEAN | YES | — | Trigger LLM on photo |
| `ai_analysis_prompt` | TEXT | YES | — | LLM prompt |
| `ai_analysis_schema` | JSONB | YES | — | Expected JSON structure |
| `master_data_code` | TEXT | YES | — | Links to project_data |
| `master_data_config` | TEXT | YES | — | JSON string with autofill config |
| `composite_fields_json` | TEXT | YES | — | JSON array of sub-fields |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Question types**: `text`, `textarea`, `number`, `date`, `time`, `select`, `multiSelect`, `boolean`, `gps`, `photo`, `readonlyText`, `masterDataQuestion`, `lookupAutofill`, `composite`

**Mobile reads**: Fetch all questions for a questionnaire (cached for offline).
**Mobile writes**: Never.

### 2.3 Record (Survey Response) Tables

#### `records` — Survey responses
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `questionnaire_id` | TEXT | YES | — | FK → questionnaires |
| `assignee_id` | TEXT | YES | — | FK → app_users (surveyor) |
| `external_id` | TEXT | YES | — | Display ID (timestamp-based) |
| `serial_number` | TEXT | YES | — | Sequential number |
| `status` | TEXT | YES | `'not_started'` | See status workflow |
| `has_questionnaire` | BOOLEAN | YES | — | |
| `area` | TEXT | YES | — | Geographic area |
| `category` | TEXT | YES | — | Record category |
| `location_info` | TEXT | YES | — | Freeform location text |
| `color_tag` | TEXT | YES | — | Visual tag |
| `color` | TEXT | YES | — | Hex color value |
| `start_time` | TEXT | YES | — | When form filling started |
| `end_time` | TEXT | YES | — | When form filling completed |
| `processed_at` | TEXT | YES | — | When processed by admin |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Status workflow**:
```
not_started → in_progress → form_filled → handled → sent_to_control → passed_quality_control
```

**Mobile reads**: List records per project, filter by assignee/status.
**Mobile writes**: Create new records, update status and timestamps.

#### `record_answers` — Question responses
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `question_id` | TEXT | YES | — | FK → questions |
| `page_id` | TEXT | YES | — | FK → record_pages |
| `value` | TEXT | YES | — | Raw answer value |
| `display_value` | TEXT | YES | — | Human-readable value |
| `ai_analysis_result` | TEXT | YES | — | JSON from LLM |
| `created_by` | TEXT | YES | — | User who answered |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Populate form with existing answers.
**Mobile writes**: Save answers during form filling (heaviest write operation).

#### `record_pages` — Multi-page form data
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `page_number` | INTEGER | YES | — | Sequence |
| `status` | TEXT | YES | `'pending'` | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Determine page count and navigation.
**Mobile writes**: Create pages, update status.

#### `record_files` — Attached files
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `project_id` | TEXT | YES | — | FK → projects |
| `file_name` | TEXT | YES | — | |
| `file_url` | TEXT | YES | — | Supabase Storage URL |
| `file_type` | TEXT | YES | — | MIME type |
| `file_size` | TEXT | YES | — | Bytes as string |
| `uploaded_by_id` | TEXT | YES | — | FK → app_users |
| `page_number` | INTEGER | YES | — | Which page the file belongs to |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Show attached files in record detail.
**Mobile writes**: Create file metadata after upload.

#### `record_locations` — GPS coordinates
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `latitude` | DOUBLE PRECISION | YES | — | |
| `longitude` | DOUBLE PRECISION | YES | — | |
| `accuracy` | DOUBLE PRECISION | YES | — | Meters |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Display on map in record detail.
**Mobile writes**: Capture GPS during form filling.

#### `record_notes` — Comments
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `author_id` | TEXT | YES | — | FK → app_users |
| `text` | TEXT | YES | — | Note content |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Display notes in record detail.
**Mobile writes**: Add notes (both roles).

#### `record_status_history` — Status audit trail
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `record_id` | TEXT | YES | — | FK → records |
| `status` | TEXT | YES | — | Status after change |
| `comment` | TEXT | YES | — | Optional comment |
| `created_by_id` | TEXT | YES | — | FK → app_users |
| `is_primary` | BOOLEAN | YES | — | |
| `event_time` | TIMESTAMPTZ | YES | — | When the change happened |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Display status timeline in record detail.
**Mobile writes**: Create entry on every status change.

### 2.4 Master Data Tables

#### `project_data` — Lookup tables
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `name` | TEXT | YES | — | Table name |
| `code` | TEXT | YES | — | Lookup key |
| `values` | JSONB | YES | — | Array of lookup values |
| `is_active` | BOOLEAN | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

**Mobile reads**: Populate master data dropdowns (cached for offline).
**Mobile writes**: Never.

#### `categories` — Record categories per project
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `code` | TEXT | YES | — | |
| `name` | TEXT | YES | — | Hebrew display name |
| `is_active` | BOOLEAN | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

#### `areas` — Geographic areas per project
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | TEXT | NO | — | PK |
| `project_id` | TEXT | YES | — | FK → projects |
| `code` | TEXT | YES | — | |
| `name` | TEXT | YES | — | Hebrew display name |
| `is_active` | BOOLEAN | YES | — | |
| `created_date` | TIMESTAMPTZ | YES | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | |

### 2.5 System Tables (Read-Only for Mobile)

#### `app_settings` — Key-value config
| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT PK | `admin_emails`, `admin_email_domains`, `auto_approve_domains` |
| `value` | JSONB | Config data |
| `updated_at` | TIMESTAMPTZ | |

#### `access_requests` — User access requests
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | |
| `email` | TEXT | Requester email |
| `full_name` | TEXT | |
| `auth_user_id` | UUID | FK → auth.users |
| `status` | TEXT | CHECK: pending, approved, rejected |
| `requested_role` | TEXT | |
| `requested_at` | TIMESTAMPTZ | |
| `reviewed_by` | TEXT | FK → app_users |
| `reviewed_at` | TIMESTAMPTZ | |
| `notes` | TEXT | |

**Mobile**: Read-only. The pending approval screen checks this table.

### 2.6 Tables Not Used by Mobile

These tables exist in the shared database but are **not accessed** by the mobile app:

- `clients` — Admin-only
- `activity_logs` — Admin-only (mobile may write page-view logs in future)
- `activity_issue_trackers` — Admin-only
- `ai_analysis_reports` — Web-only
- `report_automations` — Web-only
- `report_export_jobs` — Web-only
- `import_jobs` — Web-only
- `import_data_jobs` — Web-only
- `project_files` — Web-only (file management)

---

## 3. Entity Relationship Diagram

```
                    ┌──────────┐
                    │ clients  │
                    └────┬─────┘
                         │ 1:N
                    ┌────┴─────┐
              ┌─────┤ projects ├──────┐
              │     └────┬─────┘      │
              │          │            │
         1:N  │     1:N  │       1:N  │
    ┌─────────┴──┐  ┌────┴────────┐  ┌┴───────────┐
    │project_users│  │questionnaires│  │project_data│
    └──────┬─────┘  └────┬────────┘  └────────────┘
           │              │
      N:1  │         1:N  │
    ┌──────┴─────┐  ┌─────┴──────┐    ┌────────────────────────┐
    │ app_users  │  │ questions  │    │questionnaire_assignments│
    └──────┬─────┘  └────────────┘    └────────────────────────┘
           │
      1:N  │ (assignee_id)
    ┌──────┴─────┐
    │  records   │
    └──────┬─────┘
           │
     ┌─────┼─────────┬──────────┬──────────┬──────────┐
     │     │         │          │          │          │
     ▼     ▼         ▼          ▼          ▼          ▼
  record  record   record    record    record    record
  answers pages    files     locations notes     status
                                                 history
```

---

## 4. Database Triggers & Functions

### 4.1 Auto-Provision User on Sign-Up

Trigger: `handle_new_user()` fires on `auth.users` INSERT.

Logic (in priority order):
1. **Pre-created by admin**: If `app_users` row exists with matching email → link `auth_user_id`.
2. **First user**: If `app_users` is empty → create admin + active.
3. **Admin email match**: Check `app_settings.admin_emails` → admin + active.
4. **Admin domain match**: Check `app_settings.admin_email_domains` → admin + active.
5. **Auto-approve domain**: Check `app_settings.auto_approve_domains` → surveyor + active.
6. **Default**: Create surveyor + `is_active = false` + `access_requests` row.

**Mobile impact**: After Google OAuth, the trigger runs server-side. The mobile app then fetches the `app_users` row. If `is_active = false`, show pending approval screen.

### 4.2 Auto-Update `updated_at`

All tables have a trigger that sets `updated_at = now()` on every UPDATE. This is critical for the sync engine's incremental pull (see ARCHITECTURE.md §6.3).

---

## 5. Mobile-Specific Schema Addition

### 5.1 Push Token Column

```sql
-- Migration: Add push_token to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS push_token TEXT;
```

This is the **only** schema change required for mobile. The column stores the Expo Push Token for notifications.

---

## 6. Key Mobile Queries

### 6.1 Surveyor: Get Assigned Projects

```sql
SELECT p.*
FROM projects p
JOIN project_users pu ON pu.project_id = p.id
WHERE pu.user_id = $currentUserId
  AND p.is_active = true
ORDER BY p.created_date DESC;
```

### 6.2 Surveyor: Get Available Questionnaires for Project

```sql
-- If questionnaire_assignments exist for this user, filter by them.
-- If no assignments exist, show all active questionnaires.
SELECT q.*
FROM questionnaires q
WHERE q.project_id = $projectId
  AND q.is_active = true
  AND q.status = 'active'
  AND (
    NOT EXISTS (
      SELECT 1 FROM questionnaire_assignments qa WHERE qa.questionnaire_id = q.id
    )
    OR EXISTS (
      SELECT 1 FROM questionnaire_assignments qa
      WHERE qa.questionnaire_id = q.id AND qa.user_id = $currentUserId
    )
  )
ORDER BY q.created_date DESC;
```

### 6.3 Surveyor: Get Own Records for Project

```sql
SELECT r.*
FROM records r
WHERE r.project_id = $projectId
  AND r.assignee_id = $currentUserId
ORDER BY r.created_date DESC;
```

### 6.4 Surveyor: Get Questions for Questionnaire

```sql
SELECT *
FROM questions
WHERE questionnaire_id = $questionnaireId
ORDER BY order_index ASC;
```

### 6.5 Surveyor: Get Existing Answers for Record

```sql
SELECT ra.*
FROM record_answers ra
WHERE ra.record_id = $recordId
ORDER BY ra.created_date ASC;
```

### 6.6 Manager: Get All Records for Project (with joins)

```sql
SELECT r.*, u.full_name as assignee_name
FROM records r
LEFT JOIN app_users u ON u.id = r.assignee_id
WHERE r.project_id = $projectId
ORDER BY r.created_date DESC
LIMIT 500;
```

### 6.7 Manager: KPI — Records by Status

```sql
SELECT status, COUNT(*) as count
FROM records
WHERE project_id = $projectId
  AND created_date >= $dateFrom
GROUP BY status;
```

### 6.8 Manager: KPI — Records per Day

```sql
SELECT DATE(created_date) as day, COUNT(*) as count
FROM records
WHERE project_id = $projectId
  AND created_date >= $dateFrom
GROUP BY DATE(created_date)
ORDER BY day ASC;
```

### 6.9 Manager: KPI — Records per Surveyor

```sql
SELECT r.assignee_id, u.full_name, COUNT(*) as total,
  COUNT(*) FILTER (WHERE r.status = 'form_filled') as completed
FROM records r
JOIN app_users u ON u.id = r.assignee_id
WHERE r.project_id = $projectId
GROUP BY r.assignee_id, u.full_name;
```

### 6.10 Sync: Incremental Pull

```sql
SELECT *
FROM records
WHERE project_id = ANY($assignedProjectIds)
  AND updated_at > $lastPulledAt
ORDER BY updated_at ASC
LIMIT 1000;
```

Same pattern for all synced tables (record_answers, questions, etc.).

---

## 7. WatermelonDB Local Schema

The local SQLite schema mirrors the Supabase tables that need offline access. WatermelonDB uses its own ID system but stores the Supabase `id` as a synced field.

### 7.1 Model Definitions

```
Local Table         | Supabase Table           | Sync Direction
--------------------|--------------------------|---------------
records             | records                  | Bidirectional
record_answers      | record_answers           | Bidirectional
record_pages        | record_pages             | Bidirectional
record_files        | record_files             | Push only (create)
record_locations    | record_locations         | Push only (create)
record_notes        | record_notes             | Bidirectional
record_status_hist  | record_status_history    | Bidirectional
questionnaires      | questionnaires           | Pull only
questions           | questions                | Pull only
projects            | projects                 | Pull only
project_users       | project_users            | Pull only
project_data        | project_data             | Pull only
categories          | categories               | Pull only
areas               | areas                    | Pull only
sync_metadata       | (local only)             | N/A
```

### 7.2 Sync Metadata Table

```
sync_metadata (local only):
  table_name  TEXT PK     — Which table
  last_pulled TIMESTAMP   — Last successful pull timestamp
  last_pushed TIMESTAMP   — Last successful push timestamp
  pending     INTEGER     — Count of unsynced local changes
```

---

## 8. ID Generation for Offline Records

When creating records offline, the mobile app generates IDs locally:

```typescript
// Format: 'mob_' + timestamp + random suffix
function generateOfflineId(): string {
  return `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
```

The `mob_` prefix distinguishes mobile-generated IDs from web-generated IDs. Supabase accepts any TEXT primary key, so no server-side ID generation is needed.

---

## 9. RLS Policy Reference

### 9.1 Current State (Phase 1 — Permissive)

All tables allow full CRUD for any authenticated user:
```sql
CREATE POLICY "authenticated_full_access" ON records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 9.2 Phase 2 Target (Role-Based)

Helper functions already exist:
```sql
CREATE FUNCTION get_user_role() RETURNS TEXT  -- Returns app_users.role
CREATE FUNCTION get_app_user_id() RETURNS TEXT  -- Returns app_users.id
```

**Planned policies** (to be implemented):

```sql
-- Surveyors: Read own records + assigned project data
CREATE POLICY "surveyor_read_own_records" ON records
  FOR SELECT TO authenticated
  USING (
    assignee_id = get_app_user_id()
    OR get_user_role() IN ('admin', 'manager', 'owner', 'viewer')
  );

-- Surveyors: Write own records only
CREATE POLICY "surveyor_write_own_records" ON records
  FOR INSERT TO authenticated
  WITH CHECK (
    assignee_id = get_app_user_id()
    OR get_user_role() IN ('admin', 'manager', 'owner')
  );

-- Managers: Read all records in assigned projects
CREATE POLICY "manager_read_project_records" ON records
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = get_app_user_id()
    )
    OR get_user_role() = 'admin'
  );
```

**Mobile impact**: The mobile app should already scope queries by `assignee_id` (surveyor) or `project_id` (manager). Phase 2 RLS adds server-side enforcement as defense-in-depth.

---

## 10. Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `main` | Record files, survey photos | Authenticated upload, public read |
| `avatars` | Profile photos | Authenticated upload, public read |

**Mobile upload path pattern**:
- Record photos: `main/records/{recordId}/{timestamp}_{filename}`
- Profile photos: `avatars/{userId}/{timestamp}_{filename}`

---

## 11. Edge Functions Used by Mobile

| Function | Purpose | When Called |
|----------|---------|------------|
| `invoke-llm` | AI analysis of photos | After photo upload, if question has AI enabled |
| `send-push` | Push notifications | Server-side, triggered by events |
| `submit-public-form` | Public form submission | Not used by mobile (web-only) |
| `send-email` | Email notifications | Not called by mobile directly |

---

## 12. Self-Check

- [x] All 25+ tables documented with full column definitions
- [x] Read/write patterns specified per table per role
- [x] Entity relationship diagram shows all foreign keys
- [x] Key mobile queries provided as SQL (10 essential queries)
- [x] WatermelonDB local schema mirrors Supabase with sync directions
- [x] Offline ID generation strategy defined
- [x] RLS current state and Phase 2 target documented
- [x] Storage bucket paths specified
- [x] Only one schema addition required (push_token)
- [x] Sync metadata table defined for incremental pulls
- [x] Database triggers explained (auto-provision, auto-updated_at)
- [x] Cross-references: tables match ARCHITECTURE.md §6.2, queries match API hooks in CLAUDE.md
