/**
 * Local SQLite schema for offline-first storage.
 * Mirrors Supabase tables relevant to mobile.
 */

export const CREATE_TABLES_SQL = `
-- Reference data (pull-only)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  name TEXT,
  code TEXT,
  description TEXT,
  category TEXT,
  start_date TEXT,
  status TEXT,
  is_active INTEGER DEFAULT 1,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS questionnaires (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT,
  code TEXT,
  description TEXT,
  version TEXT,
  status TEXT DEFAULT 'active',
  is_active INTEGER DEFAULT 1,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS questionnaire_assignments (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT,
  code TEXT,
  order_index INTEGER DEFAULT 0,
  is_required INTEGER DEFAULT 0,
  options_json TEXT,
  help_text TEXT,
  section_name TEXT,
  ai_analysis_enabled INTEGER DEFAULT 0,
  ai_analysis_prompt TEXT,
  ai_analysis_schema TEXT,
  master_data_code TEXT,
  master_data_config TEXT,
  composite_fields_json TEXT,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_data (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT,
  code TEXT,
  values_json TEXT,
  is_active INTEGER DEFAULT 1,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  code TEXT,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  created_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  code TEXT,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  created_date TEXT,
  updated_at TEXT
);

-- User data (bidirectional)
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  questionnaire_id TEXT NOT NULL,
  assignee_id TEXT NOT NULL,
  external_id TEXT,
  serial_number TEXT,
  status TEXT DEFAULT 'not_started',
  has_questionnaire INTEGER DEFAULT 1,
  area TEXT,
  category TEXT,
  location_info TEXT,
  color_tag TEXT,
  color TEXT,
  start_time TEXT,
  end_time TEXT,
  processed_at TEXT,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_answers (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  page_id TEXT,
  value TEXT,
  display_value TEXT,
  ai_analysis_result TEXT,
  created_by TEXT,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_pages (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  page_number INTEGER,
  status TEXT,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_locations (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_files (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  project_id TEXT,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size TEXT,
  uploaded_by_id TEXT,
  page_number INTEGER,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_notes (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  author_id TEXT,
  text TEXT,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS record_status_history (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  status TEXT,
  comment TEXT,
  created_by_id TEXT,
  is_primary INTEGER DEFAULT 0,
  event_time TEXT,
  created_date TEXT,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0
);

-- Sync tracking
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name TEXT PRIMARY KEY,
  last_pulled_at TEXT,
  last_pushed_at TEXT,
  pending_count INTEGER DEFAULT 0
);

-- Initialize sync_metadata for all tracked tables
INSERT OR IGNORE INTO sync_metadata (table_name) VALUES
  ('projects'), ('questionnaires'), ('questionnaire_assignments'),
  ('questions'), ('project_data'), ('categories'), ('areas'),
  ('records'), ('record_answers'), ('record_pages'),
  ('record_locations'), ('record_files'), ('record_notes'),
  ('record_status_history');

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_records_project ON records(project_id);
CREATE INDEX IF NOT EXISTS idx_records_assignee ON records(assignee_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_dirty ON records(_dirty) WHERE _dirty = 1;
CREATE INDEX IF NOT EXISTS idx_record_answers_record ON record_answers(record_id);
CREATE INDEX IF NOT EXISTS idx_record_answers_dirty ON record_answers(_dirty) WHERE _dirty = 1;
CREATE INDEX IF NOT EXISTS idx_questions_questionnaire ON questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_assignments_user ON questionnaire_assignments(user_id);
`;
