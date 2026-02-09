import NetInfo from '@react-native-community/netinfo';
import { SUPABASE_URL } from '@/lib/constants';

/**
 * Checks whether the device has network connectivity AND Supabase is reachable.
 * NetInfo alone can report "connected" when behind a captive portal or
 * when the Supabase server is unreachable.
 *
 * Uses a HEAD request to the Supabase REST endpoint instead of a DB query,
 * because DB queries can fail due to RLS policies or missing auth tokens
 * even when the server is perfectly reachable.
 */
export async function checkFullConnectivity(): Promise<{
  hasNetwork: boolean;
  supabaseReachable: boolean;
}> {
  const netState = await NetInfo.fetch();
  const hasNetwork = netState.isConnected ?? false;

  if (!hasNetwork) {
    return { hasNetwork: false, supabaseReachable: false };
  }

  try {
    // A HEAD request to the REST endpoint.
    // Any HTTP response (including 401/403) means the server is reachable.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return { hasNetwork: true, supabaseReachable: response.status > 0 };
  } catch {
    return { hasNetwork: true, supabaseReachable: false };
  }
}
