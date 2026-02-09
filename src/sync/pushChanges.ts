import { supabase } from '@/api/supabase';
import { getDatabase } from '@/db';
import { useSyncStore } from '@/store/syncStore';
import { SYNC_CONFIG } from '@/lib/constants';

/** Tables that are pushed to the server (user-created data). */
const PUSH_TABLES = [
  'records',
  'record_answers',
  'record_pages',
  'record_locations',
  'record_files',
  'record_notes',
  'record_status_history',
] as const;

type PushTable = (typeof PUSH_TABLES)[number];

/** Columns that are local-only and should NOT be sent to Supabase. */
const LOCAL_ONLY_COLUMNS = ['_dirty', '_deleted'];

/**
 * Pushes all dirty local rows to Supabase.
 * Marks rows as clean (_dirty = 0) on success.
 */
export async function pushChanges(): Promise<void> {
  const db = getDatabase();

  let totalPushed = 0;

  for (const tableName of PUSH_TABLES) {
    try {
      const count = await pushTable(db, tableName);
      totalPushed += count;
    } catch (err) {
      console.error(`Push failed for ${tableName}:`, err);
      useSyncStore.getState().addSyncError({
        table: tableName,
        recordId: '',
        error: err instanceof Error ? err.message : 'Unknown push error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (totalPushed > 0) {
    useSyncStore.getState().setLastSyncAt(new Date());
  }

  // Recount pending
  await updatePendingCount(db);
}

async function pushTable(
  db: import('expo-sqlite').SQLiteDatabase,
  tableName: PushTable
): Promise<number> {
  // Get dirty rows
  const dirtyRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${tableName} WHERE _dirty = 1`
  );

  if (dirtyRows.length === 0) return 0;

  let pushed = 0;

  for (const row of dirtyRows) {
    const id = row.id as string;
    const isDeleted = (row._deleted as number) === 1;

    try {
      if (isDeleted) {
        // Delete from server
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;

        // Remove locally
        await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      } else {
        // Build payload without local-only columns and with values_json → values rename
        const payload: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          if (LOCAL_ONLY_COLUMNS.includes(key)) continue;
          payload[key] = val;
        }

        // Upsert to server
        const { error } = await supabase
          .from(tableName)
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;

        // Mark as clean
        await db.runAsync(
          `UPDATE ${tableName} SET _dirty = 0 WHERE id = ?`,
          [id]
        );
      }

      pushed++;
    } catch (err) {
      console.error(`Push failed for ${tableName}/${id}:`, err);
      useSyncStore.getState().addSyncError({
        table: tableName,
        recordId: id,
        error: err instanceof Error ? err.message : 'Push failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update sync metadata
  if (pushed > 0) {
    await db.runAsync(
      'UPDATE sync_metadata SET last_pushed_at = ? WHERE table_name = ?',
      [new Date().toISOString(), tableName]
    );
  }

  return pushed;
}

/**
 * Recalculates and updates the pending count in the sync store.
 */
async function updatePendingCount(
  db: import('expo-sqlite').SQLiteDatabase
): Promise<void> {
  let total = 0;

  for (const tableName of PUSH_TABLES) {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE _dirty = 1`
    );
    const count = result?.count ?? 0;
    total += count;

    await db.runAsync(
      'UPDATE sync_metadata SET pending_count = ? WHERE table_name = ?',
      [count, tableName]
    );
  }

  useSyncStore.getState().setPendingCount(total);
}

/**
 * Retry configuration for exponential backoff.
 */
export function getRetryDelay(attempt: number): number {
  return SYNC_CONFIG.RETRY_BACKOFF[
    Math.min(attempt, SYNC_CONFIG.RETRY_BACKOFF.length - 1)
  ];
}
