import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';

import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/api/supabase';
import { colors } from '@/theme/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID =
  '834385599368-1gasplu848e78k211tr89io9qqnkh988.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID =
  '834385599368-82265elpc9af8nh0nr78djvnpvu7n03v.apps.googleusercontent.com';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleSignIn(authentication.idToken);
      }
    } else if (response?.type === 'error') {
      setError('שגיאה בהתחברות עם Google');
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (signInError) throw signInError;
      router.replace('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'שגיאה בהתחברות עם Google';
      setError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGooglePress = useCallback(async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await promptAsync();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'שגיאה בהתחברות עם Google';
      setError(message);
      setIsGoogleLoading(false);
    }
  }, [promptAsync]);

  // Apple Sign-In
  const handleApplePress = useCallback(async () => {
    setError(null);
    setIsAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('לא התקבל טוקן מ-Apple');
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (signInError) throw signInError;
      router.replace('/');
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — not an error
      } else {
        const message =
          err instanceof Error ? err.message : 'שגיאה בהתחברות עם Apple';
        setError(message);
      }
    } finally {
      setIsAppleLoading(false);
    }
  }, []);

  const isAnyLoading = isGoogleLoading || isAppleLoading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.neutral[50],
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Logo */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.logoSection}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandName, { color: colors.neutral[900] }]}>
            Datrix
          </Text>
        </AnimatedView>

        {/* Welcome Text */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.welcomeSection}
        >
          <Text style={[styles.title, { color: colors.neutral[900] }]}>
            ברוכים הבאים
          </Text>
          <Text style={[styles.subtitle, { color: colors.neutral[500] }]}>
            התחבר כדי להמשיך
          </Text>
        </AnimatedView>

        {/* Error */}
        {error && (
          <AnimatedView
            entering={FadeInDown.duration(300)}
            style={[styles.errorBox, { backgroundColor: colors.danger[50] }]}
          >
            <Text style={[styles.errorText, { color: colors.danger[600] }]}>
              {error}
            </Text>
          </AnimatedView>
        )}

        {/* Auth Buttons */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
          style={styles.buttonsSection}
        >
          {/* Apple */}
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={handleApplePress}
              disabled={isAnyLoading}
              style={({ pressed }) => [
                styles.authButton,
                {
                  backgroundColor: '#000000',
                  opacity: pressed || isAnyLoading ? 0.8 : 1,
                },
              ]}
            >
              {isAppleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                  <Text style={[styles.authButtonText, { color: '#FFFFFF' }]}>
                    המשך עם Apple
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* Google */}
          <Pressable
            onPress={handleGooglePress}
            disabled={!request || isAnyLoading}
            style={({ pressed }) => [
              styles.authButton,
              {
                backgroundColor: '#FFFFFF',
                borderColor: colors.neutral[200],
                borderWidth: 1,
                opacity: pressed || !request || isAnyLoading ? 0.7 : 1,
              },
            ]}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={colors.neutral[600]} size="small" />
            ) : (
              <>
                <View style={[styles.googleIconBox, { backgroundColor: colors.neutral[100] }]}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={[styles.authButtonText, { color: colors.neutral[700] }]}>
                  המשך עם Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.neutral[200] }]} />
            <Text style={[styles.dividerText, { color: colors.neutral[400] }]}>או</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.neutral[200] }]} />
          </View>

          {/* Email */}
          <Pressable
            onPress={() => router.push('/(auth)/email-login')}
            disabled={isAnyLoading}
            style={({ pressed }) => [
              styles.authButton,
              {
                backgroundColor: colors.primary[600],
                opacity: pressed || isAnyLoading ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.authButtonText, { color: '#FFFFFF' }]}>
              המשך עם אימייל
            </Text>
          </Pressable>
        </AnimatedView>

        {/* Version */}
        <AnimatedView
          entering={FadeInUp.duration(400).delay(500).easing(Easing.out(Easing.ease))}
          style={styles.versionRow}
        >
          <Text style={[styles.versionText, { color: colors.neutral[400] }]}>
            v1.0.0
          </Text>
        </AnimatedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  brandName: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Welcome
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Error
  errorBox: {
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Buttons
  buttonsSection: {
    gap: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 100,
    gap: 10,
  },
  authButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Version
  versionRow: {
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    fontSize: 13,
  },
});
