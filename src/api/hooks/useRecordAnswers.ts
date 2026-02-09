import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { snakeToCamel, camelToSnake } from '@/lib/caseUtils';
import { generateOfflineId } from '@/lib/utils';
import { useAuth } from '@/auth';
import type { RecordAnswer, RecordAnswerInsert } from '@/lib/types';

/**
 * Hook to fetch answers for a record
 */
export function useRecordAnswers(recordId: string | undefined) {
  return useQuery({
    queryKey: ['recordAnswers', recordId],
    queryFn: async (): Promise<RecordAnswer[]> => {
      if (!recordId) return [];

      const { data, error } = await supabase
        .from('record_answers')
        .select('*')
        .eq('record_id', recordId)
        .order('created_date', { ascending: true });

      if (error) throw error;

      return data.map((a) => snakeToCamel<RecordAnswer>(a));
    },
    enabled: !!recordId,
  });
}

/**
 * Hook to create a new record answer.
 * Uses upsert with onConflict: 'id' for idempotent retries.
 */
export function useCreateRecordAnswer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      answer: Omit<RecordAnswerInsert, 'id' | 'createdBy'>
    ): Promise<RecordAnswer> => {
      const newAnswer = {
        ...answer,
        id: generateOfflineId(),
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('record_answers')
        .upsert(camelToSnake(newAnswer), { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      return snakeToCamel<RecordAnswer>(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['recordAnswers', variables.recordId],
      });
    },
  });
}

/**
 * Hook to update an existing record answer
 */
export function useUpdateRecordAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      recordId,
      ...updates
    }: Partial<RecordAnswer> & {
      id: string;
      recordId: string;
    }): Promise<RecordAnswer> => {
      const { data, error } = await supabase
        .from('record_answers')
        .update(camelToSnake(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return snakeToCamel<RecordAnswer>(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['recordAnswers', variables.recordId],
      });
    },
  });
}

/**
 * Hook to upsert a record answer (create or update).
 * Uses maybeSingle() + upsert to avoid race conditions.
 */
export function useUpsertRecordAnswer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      answer: Omit<RecordAnswerInsert, 'id' | 'createdBy'>
    ): Promise<RecordAnswer> => {
      // Find existing answer for this question+record+page
      let existingQuery = supabase
        .from('record_answers')
        .select('id')
        .eq('record_id', answer.recordId)
        .eq('question_id', answer.questionId);

      if (answer.pageId) {
        existingQuery = existingQuery.eq('page_id', answer.pageId);
      } else {
        existingQuery = existingQuery.is('page_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      const payload = {
        id: existing?.id ?? generateOfflineId(),
        record_id: answer.recordId,
        question_id: answer.questionId,
        page_id: answer.pageId ?? null,
        value: answer.value ?? null,
        display_value: answer.displayValue ?? null,
        created_by: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from('record_answers')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return snakeToCamel<RecordAnswer>(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['recordAnswers', variables.recordId],
      });
    },
  });
}
