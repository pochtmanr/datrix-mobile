import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { snakeToCamel } from '@/lib/caseUtils';
import type { Question } from '@/lib/types';

/**
 * Hook to fetch questions for a questionnaire
 * Ordered by order_index
 */
export function useQuestions(questionnaireId: string | undefined) {
  return useQuery({
    queryKey: ['questions', questionnaireId],
    queryFn: async (): Promise<Question[]> => {
      if (!questionnaireId) return [];

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data.map((q) => snakeToCamel<Question>(q));
    },
    enabled: !!questionnaireId,
  });
}

/**
 * Groups questions by section_name
 */
export function groupQuestionsBySection(questions: Question[]): Map<string, Question[]> {
  const sections = new Map<string, Question[]>();

  questions.forEach((question) => {
    const sectionName = question.sectionName || 'כללי';
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName)!.push(question);
  });

  return sections;
}
