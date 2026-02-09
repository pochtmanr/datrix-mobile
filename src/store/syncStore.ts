import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncError } from '@/lib/types';

/**
 * Global connectivity and sync state store
 */

interface SyncState {
  // Connection state
  isOnline: boolean;

  // Sync state
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncErrors: SyncError[];

  // Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  setLastSyncAt: (date: Date | null) => void;
  addSyncError: (error: SyncError) => void;
  clearSyncErrors: () => void;
  reset: () => void;
}

const initialState = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncErrors: [],
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      ...initialState,

      setOnline: (online) => set({ isOnline: online }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      setPendingCount: (count) => set({ pendingCount: count }),

      incrementPending: () =>
        set((state) => ({ pendingCount: state.pendingCount + 1 })),

      decrementPending: () =>
        set((state) => ({
          pendingCount: Math.max(0, state.pendingCount - 1),
        })),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      addSyncError: (error) =>
        set((state) => ({
          syncErrors: [...state.syncErrors.slice(-9), error], // Keep last 10 errors
        })),

      clearSyncErrors: () => set({ syncErrors: [] }),

      reset: () => set(initialState),
    }),
    {
      name: 'datrix-sync-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingCount: state.pendingCount,
        lastSyncAt: state.lastSyncAt,
        syncErrors: state.syncErrors,
      }),
    }
  )
);
