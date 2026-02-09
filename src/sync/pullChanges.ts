import { supabase } from '@/api/supabase';
import { getDatabase } from '@/db';
import { useSyncStore } from '@/store/syncStore';

/** Tables that are pulled from the server (read-only reference data + bidirectional). */
const PULL_TABLES = [
  'projects',
  'questionnaires',
  'questionnaire_assignments',
  'questions',
  'project_data',
  'categories',
  'areas',
  'records',
  'record_answers',
  'record_pages',
  'record_notes',
  'record_status_history',
] as const;

type PullTable = (typeof PULL_TABLES)[number];

/** Tables scoped to the user's assigned projects (not global). */
const PROJECT_SCOPED_TABLES: PullTable[] = [
  'questionnaires',
  'questions',
  'project_data',
  'categories',
  'areas',
];

/** Tables scoped to records the user owns. */
const RECORD_SCOPED_TABLES: PullTable[] = [
  'record_answers',
  'record_pages',
  'record_notes',
  'record_status_history',
];

/**
 * Pulls incremental changes from Supabase for all tracked tables.
 * Uses updated_at > lastPulledAt for each table.
 */
export async function pullChanges(userId: string): Promise<void> {
  const db = getDatabase();

  // 1. Get assigned project IDs
  const { data: projectUsers } = await supabase
    .from('project_users')
    .select('project_id')
    .eq('user_id', userId);

  const projectIds = projectUsers?.map((pu) => pu.project_id) ?? [];
  if (projectIds.length === 0) return;

  for (const tableName of PULL_TABLES) {
    try {
      await pullTable(db, tableName, userId, projectIds);
    } catch (err) {
      console.error(`Pull failed for ${tableName}:`, err);
      useSyncStore.getState().addSyncError({
        table: tableName,
        recordId: '',
        error: err instanceof Error ? err.message : 'Unknown pull error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

async function pullTable(
  db: import('expo-sqlite').SQLiteDatabase,
  tableName: PullTable,
  userId: string,
  projectIds: string[]
): Promise<void> {
  // Get last pull timestamp
  const meta = await db.getFirstAsync<{ last_pulled_at: string | null }>(
    'SELECT last_pulled_at FROM sync_metadata WHERE table_name = ?',
    [tableName]
  );
  const lastPulledAt = meta?.last_pulled_at ?? '1970-01-01T00:00:00Z';

  // Build Supabase query with scope
  let query = supabase.from(tableName).select('*').gt('updated_at', lastPulledAt);

  // Apply scoping
  if (tableName === 'projects') {
    query = query.in('id', projectIds);
  } else if (tableName === 'questionnaire_assignments') {
    query = query.eq('user_id', userId);
  } else if (tableName === 'records') {
    query = query.eq('assignee_id', userId);
  } else if (PROJECT_SCOPED_TABLES.includes(tableName)) {
    query = query.in('project_id', projectIds);
  } else if (RECORD_SCOPED_TABLES.includes(tableName)) {
    // For record-child tables, we pull based on records we own
    const localRecordIds = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM records WHERE assignee_id = ?',
      [userId]
    );
    const rIds = localRecordIds.map((r) => r.id);
    if (rIds.length === 0) return;
    query = query.in('record_id', rIds);
  }

  const { data: rows, error } = await query.order('updated_at', { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return;

  // Get local table column names so we can skip unknown server columns
  const tableInfo = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`
  );
  const localColumnSet = new Set(tableInfo.map((col) => col.name));

  // Upsert each row into local SQLite
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const entries: [string, unknown][] = [];

      for (const [key, val] of Object.entries(row)) {
        // Rename 'values' → 'values_json' for project_data (reserved word)
        const localKey = (tableName === 'project_data' && key === 'values') ? 'values_json' : key;
        // Only include columns that exist in the local table
        if (!localColumnSet.has(localKey)) continue;
        entries.push([localKey, val]);
      }

      if (entries.length === 0) continue;

      const localColumns = entries.map(([k]) => k);
      const placeholders = localColumns.map(() => '?').join(', ');
      const values = entries.map(([, v]): string | number | null => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return v;
        return String(v);
      });

      const sql = `INSERT OR REPLACE INTO ${tableName} (${localColumns.join(', ')}) VALUES (${placeholders})`;
      await db.runAsync(sql, values);
    }

    // Update sync metadata
    await db.runAsync(
      'UPDATE sync_metadata SET last_pulled_at = ? WHERE table_name = ?',
      [now, tableName]
    );
  });
}
