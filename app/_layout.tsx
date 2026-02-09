import '../src/theme/global.css';

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import NetInfo from '@react-native-community/netinfo';
import { I18nManager, StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

import { AuthProvider } from '@/auth';
import { queryClient } from '@/api/queryClient';
import { useSyncStore } from '@/store';
import { initDatabase } from '@/db';

// Configure Reanimated logger to suppress strict color validation errors
// from HeroUI Native's CSS variable resolution during initial render
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Disable system RTL — we handle Hebrew layout explicitly via row-reverse.
// This undoes the persistent forceRTL(true) flag from previous builds.
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}


function NetworkListener() {
  const setOnline = useSyncStore((state) => state.setOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (netState) => {
      const hasNetwork = netState.isConnected ?? false;

      if (!hasNetwork) {
        setOnline(false);
        return;
      }

      // Verify Supabase is actually reachable (handles captive portals)
      try {
        const { checkFullConnectivity } = await import('@/lib/network');
        const { supabaseReachable } = await checkFullConnectivity();
        setOnline(supabaseReachable);
      } catch {
        setOnline(hasNetwork);
      }
    });

    return () => unsubscribe();
  }, [setOnline]);

  return null;
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        // Continue anyway — online-only mode will still work
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/splash-logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="small"
          color="#3B82F6"
          style={styles.splashSpinner}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NetworkListener />
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_left',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(surveyor)" options={{ headerShown: false }} />
                <Stack.Screen name="(manager)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 120,
    height: 120,
  },
  splashSpinner: {
    marginTop: 24,
  },
});
