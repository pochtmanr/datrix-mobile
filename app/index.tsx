import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth';
import { colors } from '@/theme/colors';

/**
 * Root Index Screen
 * Handles initial routing based on authentication and user role:
 * - No session → (auth)/login
 * - Session but inactive → (auth)/pending-approval
 * - Surveyor → (surveyor)
 * - Manager/Viewer/Owner/Admin → (manager)
 */
export default function RootIndex() {
  const { isLoading, session, user, isActive, isSurveyor, isManager } = useAuth();

  // Show branded loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color={colors.primary[600]}
          style={styles.spinner}
        />
      </View>
    );
  }

  // No session - redirect to login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Session exists but no user profile yet - might be provisioning
  if (!user) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color={colors.primary[600]}
          style={styles.spinner}
        />
      </View>
    );
  }

  // User is not active - show pending approval
  if (!isActive) {
    return <Redirect href="/(auth)/pending-approval" />;
  }

  // Route based on role
  if (isSurveyor) {
    return <Redirect href="/(surveyor)" />;
  }

  if (isManager) {
    return <Redirect href="/(manager)" />;
  }

  // Fallback to surveyor view for unknown roles
  return <Redirect href="/(surveyor)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[950],
  },
  logo: {
    width: 120,
    height: 120,
  },
  spinner: {
    marginTop: 24,
  },
});
