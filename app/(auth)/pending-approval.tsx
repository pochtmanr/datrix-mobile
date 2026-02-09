import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import { Clock, RefreshCw, LogOut, Mail } from 'lucide-react-native';

import { useAuth } from '@/auth';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Pending Approval Screen
 * Shown when user is authenticated but not yet approved (is_active = false)
 */
export default function PendingApprovalScreen() {
  const insets = useSafeAreaInsets();
  const { refreshUser, signOut, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      // If user is now active, the index will redirect appropriately
      router.replace('/');
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshUser]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
      <StatusBar style="dark" />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Pending Icon */}
        <AnimatedView
          entering={FadeInDown.duration(600).delay(100).easing(Easing.out(Easing.ease))}
          style={[styles.iconContainer, { backgroundColor: colors.warning[100] }]}
        >
          <Clock size={48} color={colors.warning[600]} />
        </AnimatedView>

        {/* Title */}
        <AnimatedView
          entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.textSection}
        >
          <Text style={[styles.title, { color: colors.neutral[900] }]}>
            החשבון שלך ממתין לאישור
          </Text>
          <Text style={[styles.subtitle, { color: colors.neutral[600] }]}>
            Your account is pending approval
          </Text>
        </AnimatedView>

        {/* Description */}
        <AnimatedView
          entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.ease))}
          style={[styles.descriptionCard, { backgroundColor: cardBg, borderColor }]}
        >
          <Text style={[styles.description, { color: colors.neutral[600] }]}>
            מנהל המערכת יאשר את הגישה שלך בהקדם.
          </Text>
          <Text style={[styles.description, { color: colors.neutral[600] }]}>
            נעדכן אותך כשהחשבון יהיה מוכן.
          </Text>
        </AnimatedView>

        {/* User Email */}
        {user?.email && (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.ease))}
            style={[styles.emailBadge, { backgroundColor: colors.neutral[100] }]}
          >
            <Mail size={16} color={colors.neutral[500]} />
            <Text style={[styles.emailText, { color: colors.neutral[600] }]}>
              {user.email}
            </Text>
          </AnimatedView>
        )}

        {/* Action Buttons */}
        <AnimatedView
          entering={FadeInUp.duration(600).delay(500).easing(Easing.out(Easing.ease))}
          style={styles.buttonsContainer}
        >
          <Pressable
            onPress={handleRefresh}
            disabled={isRefreshing || isSigningOut}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              {
                backgroundColor: colors.primary[600],
                opacity: pressed || isRefreshing ? 0.8 : 1,
              },
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>רענן / Refresh</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            disabled={isRefreshing || isSigningOut}
            style={({ pressed }) => [
              styles.button,
              styles.outlineButton,
              {
                borderColor: colors.danger[500],
                opacity: pressed || isSigningOut ? 0.8 : 1,
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.danger[500]} size="small" />
            ) : (
              <>
                <LogOut size={20} color={colors.danger[500]} />
                <Text style={[styles.outlineButtonText, { color: colors.danger[500] }]}>
                  התנתק / Sign out
                </Text>
              </>
            )}
          </Pressable>
        </AnimatedView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Icon
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  // Text Section
  textSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
  },

  // Description Card
  descriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Email Badge
  emailBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 32,
    gap: 8,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Buttons
  buttonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  button: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  primaryButton: {},
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
