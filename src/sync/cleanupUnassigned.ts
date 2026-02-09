import { supabase } from '@/api/supabase';
import { getDatabase } from '@/db';

/**
 * Detects questionnaires that are no longer assigned to the user
 * and removes them locally — but ONLY if there is no unsynced data.
 */
export async function cleanupUnassigned(userId: string): Promise<void> {
  const db = getDatabase();

  // 1. Get current server-side assignments
  const { data: serverAssignments } = await supabase
    .from('questionnaire_assignments')
    .select('questionnaire_id')
    .eq('user_id', userId);

  const serverIds = new Set(serverAssignments?.map((a) => a.questionnaire_id) ?? []);

  // 2. Get local assignments
  const localAssignments = await db.getAllAsync<{ questionnaire_id: string }>(
    'SELECT questionnaire_id FROM questionnaire_assignments WHERE user_id = ?',
    [userId]
  );

  const localIds = localAssignments.map((a) => a.questionnaire_id);

  // 3. Find removals (locally present but not on server)
  const removedIds = localIds.filter((id) => !serverIds.has(id));
  if (removedIds.length === 0) return;

  for (const qId of removedIds) {
    // Check for unsynced records under this questionnaire
    const dirtyRecords = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM records WHERE questionnaire_id = ? AND _dirty = 1',
      [qId]
    );

    const dirtyAnswers = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM record_answers
       WHERE record_id IN (SELECT id FROM records WHERE questionnaire_id = ?)
       AND _dirty = 1`,
      [qId]
    );

    const hasPending = (dirtyRecords?.count ?? 0) + (dirtyAnswers?.count ?? 0) > 0;

    if (hasPending) {
      // Do NOT delete — flag for manual resolution
      console.warn(
        `Questionnaire ${qId} unassigned but has ${dirtyRecords?.count} dirty records. Skipping cleanup.`
      );
      continue;
    }

    // Safe to clean up: remove questionnaire, questions, and associated records
    await db.withTransactionAsync(async () => {
      // Get record IDs for cascade
      const recordRows = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM records WHERE questionnaire_id = ?',
        [qId]
      );
      const recordIds = recordRows.map((r) => r.id);

      if (recordIds.length > 0) {
        const placeholders = recordIds.map(() => '?').join(',');
        await db.runAsync(`DELETE FROM record_answers WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM record_pages WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM record_locations WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM record_files WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM record_notes WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM record_status_history WHERE record_id IN (${placeholders})`, recordIds);
        await db.runAsync(`DELETE FROM records WHERE questionnaire_id = ?`, [qId]);
      }

      await db.runAsync('DELETE FROM questions WHERE questionnaire_id = ?', [qId]);
      await db.runAsync('DELETE FROM questionnaire_assignments WHERE questionnaire_id = ? AND user_id = ?', [qId, userId]);
      await db.runAsync('DELETE FROM questionnaires WHERE id = ?', [qId]);
    });
  }
}
