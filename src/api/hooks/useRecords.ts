import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { snakeToCamel, camelToSnake } from '@/lib/caseUtils';
import { generateOfflineId, generateExternalId } from '@/lib/utils';
import type { Record, RecordInsert, RecordStatus } from '@/lib/types';

interface UseRecordsOptions {
  projectId?: string;
  assigneeId?: string;
  status?: RecordStatus | RecordStatus[];
  enabled?: boolean;
}

/**
 * Hook to fetch records with optional filters
 */
export function useRecords(options?: UseRecordsOptions) {
  return useQuery({
    queryKey: ['records', options],
    queryFn: async (): Promise<Record[]> => {
      let query = supabase.from('records').select('*');

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options?.assigneeId) {
        query = query.eq('assignee_id', options.assigneeId);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      const { data, error } = await query.order('created_date', {
        ascending: false,
      });

      if (error) throw error;

      return data.map((r) => snakeToCamel<Record>(r));
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single record by ID
 */
export function useRecord(recordId: string | undefined) {
  return useQuery({
    queryKey: ['records', recordId],
    queryFn: async (): Promise<Record | null> => {
      if (!recordId) return null;

      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return snakeToCamel<Record>(data);
    },
    enabled: !!recordId,
  });
}

/**
 * Hook to create a new record.
 * Uses upsert with onConflict: 'id' so retries after a timeout are idempotent.
 */
export function useCreateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      record: Omit<RecordInsert, 'id' | 'externalId' | 'status'>
    ): Promise<Record> => {
      const newRecord = {
        ...record,
        id: generateOfflineId(),
        external_id: generateExternalId(),
        status: 'in_progress' as RecordStatus,
        start_time: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('records')
        .upsert(camelToSnake(newRecord), { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      return snakeToCamel<Record>(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({
        queryKey: ['records', { projectId: variables.projectId }],
      });
    },
  });
}

/**
 * Hook to update a record
 */
export function useUpdateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Record> & { id: string }): Promise<Record> => {
      const { data, error } = await supabase
        .from('records')
        .update(camelToSnake(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return snakeToCamel<Record>(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['records', data.id] });
    },
  });
}

/**
 * Hook to submit a record (change status to form_filled).
 * Creates the status history entry idempotently — checks for existing entry first.
 */
export function useSubmitRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string): Promise<Record> => {
      const { data, error } = await supabase
        .from('records')
        .update({
          status: 'form_filled',
          end_time: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      // Idempotent status history: only insert if this transition wasn't already recorded
      const { data: existing } = await supabase
        .from('record_status_history')
        .select('id')
        .eq('record_id', recordId)
        .eq('status', 'form_filled')
        .maybeSingle();

      if (!existing) {
        await supabase.from('record_status_history').insert({
          id: generateOfflineId(),
          record_id: recordId,
          status: 'form_filled',
          event_time: new Date().toISOString(),
        });
      }

      return snakeToCamel<Record>(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['records', data.id] });
    },
  });
}
