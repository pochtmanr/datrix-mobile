import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { pullChanges } from './pullChanges';
import { pushChanges } from './pushChanges';
import { cleanupUnassigned } from './cleanupUnassigned';
import { useSyncStore } from '@/store/syncStore';
import { SYNC_CONFIG } from '@/lib/constants';

let pullInterval: ReturnType<typeof setInterval> | null = null;
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let netInfoUnsubscribe: (() => void) | null = null;
let currentUserId: string | null = null;

/**
 * Starts all sync triggers:
 * - Periodic pull every 5 min
 * - Push debounced 3s after writes
 * - Pull on app foreground
 * - Push+pull on network reconnect
 */
export function startSync(userId: string): void {
  if (currentUserId === userId) return; // already running
  stopSync(); // clean up any previous
  currentUserId = userId;

  // Initial full sync
  runFullSync(userId);

  // Periodic pull
  pullInterval = setInterval(() => {
    if (useSyncStore.getState().isOnline) {
      runPull(userId);
    }
  }, SYNC_CONFIG.PULL_INTERVAL_MS);

  // App state listener (foreground → pull)
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active' && useSyncStore.getState().isOnline && currentUserId) {
      runPull(currentUserId);
    }
  });

  // Network reconnect listener
  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const wasOffline = !useSyncStore.getState().isOnline;
    const isNowOnline = state.isConnected ?? false;

    if (wasOffline && isNowOnline && currentUserId) {
      // Reconnect: push pending + pull
      runFullSync(currentUserId);
    }
  });
}

/**
 * Stops all sync triggers. Call on logout.
 */
export function stopSync(): void {
  if (pullInterval) {
    clearInterval(pullInterval);
    pullInterval = null;
  }
  if (pushTimeout) {
    clearTimeout(pushTimeout);
    pushTimeout = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
  currentUserId = null;
}

/**
 * Schedules a debounced push (call after local writes).
 */
export function schedulePush(): void {
  if (pushTimeout) clearTimeout(pushTimeout);

  pushTimeout = setTimeout(async () => {
    if (!useSyncStore.getState().isOnline) return;

    try {
      useSyncStore.getState().setSyncing(true);
      await pushChanges();
    } catch (err) {
      console.error('Debounced push failed:', err);
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }, SYNC_CONFIG.PUSH_DEBOUNCE_MS);
}

/**
 * Runs a full sync cycle: push pending → pull updates → cleanup.
 */
async function runFullSync(userId: string): Promise<void> {
  if (useSyncStore.getState().isSyncing) return;

  try {
    useSyncStore.getState().setSyncing(true);
    useSyncStore.getState().clearSyncErrors();

    await pushChanges();
    await pullChanges(userId);
    await cleanupUnassigned(userId);

    useSyncStore.getState().setLastSyncAt(new Date());
  } catch (err) {
    console.error('Full sync failed:', err);
  } finally {
    useSyncStore.getState().setSyncing(false);
  }
}

/**
 * Runs a pull-only cycle.
 */
async function runPull(userId: string): Promise<void> {
  if (useSyncStore.getState().isSyncing) return;

  try {
    useSyncStore.getState().setSyncing(true);
    await pullChanges(userId);
    useSyncStore.getState().setLastSyncAt(new Date());
  } catch (err) {
    console.error('Pull failed:', err);
  } finally {
    useSyncStore.getState().setSyncing(false);
  }
}

/**
 * Manual sync trigger — exposed for the profile "Force Sync" button.
 */
export async function forceSync(): Promise<void> {
  if (!currentUserId) return;
  await runFullSync(currentUserId);
}
