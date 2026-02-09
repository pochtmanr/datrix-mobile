import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { snakeToCamel } from '@/lib/caseUtils';
import { useAuth } from '@/auth';
import type { Project } from '@/lib/types';

/**
 * Hook to fetch projects assigned to the current user
 */
export function useProjects(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async (): Promise<Project[]> => {
      if (!user?.id) return [];

      // Get projects where user is assigned via project_users
      const { data: projectUsers, error: puError } = await supabase
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);

      if (puError) throw puError;

      if (!projectUsers?.length) return [];

      const projectIds = projectUsers.map((pu) => pu.project_id);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .eq('is_active', true)
        .order('created_date', { ascending: false });

      if (error) throw error;

      return data.map((p) => snakeToCamel<Project>(p));
    },
    enabled: !!user?.id && (options?.enabled ?? true),
  });
}

/**
 * Hook to fetch all projects (for managers)
 */
export function useAllProjects(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('created_date', { ascending: false });

      if (error) throw error;

      return data.map((p) => snakeToCamel<Project>(p));
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return snakeToCamel<Project>(data);
    },
    enabled: !!projectId,
  });
}
