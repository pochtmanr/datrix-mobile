import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase';
import { snakeToCamel } from '@/lib/caseUtils';
import { queryClient } from '@/api/queryClient';
import { useSyncStore } from '@/store/syncStore';
import { useDraftStore } from '@/store/draftStore';
import { startSync, stopSync } from '@/sync';
import { deleteDatabase } from '@/db';
import type { AppUser, UserRole } from '@/lib/types';

/**
 * Authentication context providing user session and profile management
 */

interface AuthContextType {
  // Session state
  session: Session | null;
  user: AppUser | null;
  authUser: User | null;

  // Status flags
  isLoading: boolean;
  isAuthenticated: boolean;
  isActive: boolean;

  // Role helpers
  role: UserRole | null;
  isSurveyor: boolean;
  isManager: boolean;

  // Actions
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches the app_users profile for the authenticated user
   */
  const fetchUserProfile = useCallback(async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return snakeToCamel<AppUser>(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  /**
   * Refreshes the user profile from the database
   */
  const refreshUser = useCallback(async () => {
    if (!authUser?.id) return;

    const profile = await fetchUserProfile(authUser.id);
    setUser(profile);
  }, [authUser?.id, fetchUserProfile]);

  /**
   * Signs out the user and clears all local state and caches.
   * This prevents data leakage between users on the same device.
   */
  const signOut = useCallback(async () => {
    try {
      // Stop sync engine first
      stopSync();

      await supabase.auth.signOut();

      // Clear all local stores
      useSyncStore.getState().reset();
      useDraftStore.getState().clearAll();

      // Clear React Query cache
      queryClient.clear();

      // Delete local SQLite database
      await deleteDatabase();

      setSession(null);
      setAuthUser(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  /**
   * Handles auth state changes from Supabase
   */
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);
        setAuthUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const profile = await fetchUserProfile(initialSession.user.id);
          if (mounted) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setAuthUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        const profile = await fetchUserProfile(newSession.user.id);
        if (mounted) {
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Start sync engine when user is authenticated
  useEffect(() => {
    if (user?.id) {
      startSync(user.id);
    }
    return () => {
      // Cleanup on unmount or user change
      if (!user?.id) {
        stopSync();
      }
    };
  }, [user?.id]);

  // Computed values
  const isAuthenticated = !!session && !!user;
  const isActive = user?.isActive ?? false;
  const role = user?.role ?? null;
  const isSurveyor = role === 'surveyor';
  const isManager = role === 'manager' || role === 'viewer' || role === 'owner' || role === 'admin';

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      authUser,
      isLoading,
      isAuthenticated,
      isActive,
      role,
      isSurveyor,
      isManager,
      refreshUser,
      signOut,
    }),
    [
      session,
      user,
      authUser,
      isLoading,
      isAuthenticated,
      isActive,
      role,
      isSurveyor,
      isManager,
      refreshUser,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
