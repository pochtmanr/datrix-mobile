import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import { ArrowRight, Mail, Lock } from 'lucide-react-native';

import { supabase } from '@/api/supabase';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function EmailLoginScreen() {
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!email.trim()) {
      setError('נא להזין כתובת אימייל');
      return;
    }
    if (!password) {
      setError('נא להזין סיסמה');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      router.replace('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'שגיאה בהתחברות';

      if (message.includes('Invalid login credentials')) {
        setError('אימייל או סיסמה שגויים');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.neutral[50] },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.08)' },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.neutral[100] }]}
        >
          <ArrowRight size={20} color={colors.primary[600]} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            התחברות עם אימייל
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Form */}
          <AnimatedView
            entering={FadeInUp.duration(500).delay(100).easing(Easing.out(Easing.ease))}
            style={styles.formSection}
          >
            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                אימייל
              </Text>
              <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <Mail size={18} color={colors.neutral[500]} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!isLoading}
                  style={[styles.input, { color: colors.neutral[900] }]}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                סיסמה
              </Text>
              <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <Lock size={18} color={colors.neutral[500]} />
                </View>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="הזן סיסמה"
                  placeholderTextColor={colors.neutral[400]}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                  style={[styles.input, { color: colors.neutral[900] }]}
                />
              </View>
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginButton,
                {
                  backgroundColor: colors.primary[600],
                  opacity: pressed || isLoading ? 0.8 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>התחבר</Text>
              )}
            </Pressable>
          </AnimatedView>

          {/* Register Link */}
          <AnimatedView
            entering={FadeInUp.duration(500).delay(200).easing(Easing.out(Easing.ease))}
            style={styles.registerSection}
          >
            <Text style={[styles.registerPrompt, { color: colors.neutral[500] }]}>
              אין לך חשבון?
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={[styles.registerLink, { color: colors.primary[600] }]}>
                צור חשבון חדש
              </Text>
            </Pressable>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
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
    textAlign: 'right',
    lineHeight: 20,
  },

  // Form
  formSection: {
    gap: 16,
  },
  fieldContainer: {},
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    textAlign: 'right',
  },

  // Login button
  loginButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Register
  registerSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  registerPrompt: {
    fontSize: 15,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
