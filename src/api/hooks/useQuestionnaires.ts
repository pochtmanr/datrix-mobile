import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { snakeToCamel } from '@/lib/caseUtils';
import { useAuth } from '@/auth';
import type { Questionnaire } from '@/lib/types';

/**
 * Hook to fetch questionnaires for a project
 * Filters by user assignments if they exist
 */
export function useQuestionnaires(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['questionnaires', projectId, user?.id],
    queryFn: async (): Promise<Questionnaire[]> => {
      if (!projectId) return [];

      // First check if there are any assignments for this user
      const { data: assignments } = await supabase
        .from('questionnaire_assignments')
        .select('questionnaire_id')
        .eq('user_id', user?.id ?? '');

      const assignedIds = assignments?.map((a) => a.questionnaire_id) ?? [];

      // Build query
      let query = supabase
        .from('questionnaires')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .eq('status', 'active');

      // If user has specific assignments, filter by them
      // Otherwise, show all active questionnaires
      if (assignedIds.length > 0) {
        query = query.in('id', assignedIds);
      }

      const { data, error } = await query.order('created_date', {
        ascending: false,
      });

      if (error) throw error;

      return data.map((q) => snakeToCamel<Questionnaire>(q));
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch a single questionnaire by ID
 */
export function useQuestionnaire(questionnaireId: string | undefined) {
  return useQuery({
    queryKey: ['questionnaires', questionnaireId],
    queryFn: async (): Promise<Questionnaire | null> => {
      if (!questionnaireId) return null;

      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', questionnaireId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return snakeToCamel<Questionnaire>(data);
    },
    enabled: !!questionnaireId,
  });
}
