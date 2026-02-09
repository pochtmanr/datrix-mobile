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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Mail, Lock, User, Phone, ChevronLeft } from 'lucide-react-native';

import { supabase } from '@/api/supabase';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

const TOTAL_STEPS = 3;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  // Refs for auto-focus
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Step state
  const [step, setStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStep = useCallback((): boolean => {
    setError(null);

    if (step === 1) {
      if (!email.trim()) {
        setError('נא להזין כתובת אימייל');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('כתובת אימייל לא תקינה');
        return false;
      }
      if (!password) {
        setError('נא להזין סיסמה');
        return false;
      }
      if (password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
        return false;
      }
      if (password !== confirmPassword) {
        setError('הסיסמאות אינן תואמות');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!firstName.trim()) {
        setError('נא להזין שם פרטי');
        return false;
      }
      if (!lastName.trim()) {
        setError('נא להזין שם משפחה');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!phone.trim()) {
        setError('נא להזין מספר טלפון');
        return false;
      }
      return true;
    }

    return true;
  }, [step, email, password, confirmPassword, firstName, lastName, phone]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    setError(null);
    setStep((s) => s + 1);
  }, [validateStep]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      router.back();
    } else {
      setError(null);
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleRegister = useCallback(async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) throw signUpError;

      const authUserId = signUpData.user?.id;
      if (!authUserId) throw new Error('לא התקבל מזהה משתמש');

      // 2. Wait briefly for any DB trigger to create app_users row
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 3. Try to update app_users profile (trigger may have created the row)
      const { data: updated } = await supabase
        .from('app_users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
        })
        .eq('auth_user_id', authUserId)
        .select();

      // 4. If no row was updated, insert a new one
      if (!updated?.length) {
        const { error: insertError } = await supabase
          .from('app_users')
          .insert({
            auth_user_id: authUserId,
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            phone: phone.trim(),
            is_active: false,
            role: 'surveyor',
          });

        if (insertError) {
          console.warn('Profile insert error:', insertError);
        }
      }

      // Navigate to pending approval (new users are inactive by default)
      router.replace('/(auth)/pending-approval');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה ביצירת חשבון';

      if (message.includes('already registered')) {
        setError('כתובת האימייל כבר רשומה במערכת');
      } else if (message.includes('valid email')) {
        setError('כתובת אימייל לא תקינה');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [validateStep, email, password, firstName, lastName, phone]);

  const stepTitles = ['אימייל וסיסמה', 'פרטים אישיים', 'טלפון'];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.neutral[50] }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.08)' },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.neutral[100] }]}
        >
          <ArrowRight size={20} color={colors.primary[600]} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            יצירת חשבון
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            שלב {step} מתוך {TOTAL_STEPS} — {stepTitles[step - 1]}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.neutral[100] }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary[600],
              width: `${(step / TOTAL_STEPS) * 100}%`,
            },
          ]}
        />
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

          {/* Step 1: Email & Password */}
          {step === 1 && (
            <View style={styles.formSection}>
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
                    textContentType="none"
                    autoComplete="off"
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
                    placeholder="לפחות 6 תווים"
                    placeholderTextColor={colors.neutral[400]}
                    secureTextEntry
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    returnKeyType="next"
                    editable={!isLoading}
                    style={[styles.input, { color: colors.neutral[900] }]}
                  />
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                  אימות סיסמה
                </Text>
                <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                    <Lock size={18} color={colors.neutral[500]} />
                  </View>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="הזן סיסמה שוב"
                    placeholderTextColor={colors.neutral[400]}
                    secureTextEntry
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    editable={!isLoading}
                    style={[styles.input, { color: colors.neutral[900] }]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Name */}
          {step === 2 && (
            <View style={styles.formSection}>
              {/* First Name */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                  שם פרטי
                </Text>
                <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                    <User size={18} color={colors.neutral[500]} />
                  </View>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="הזן שם פרטי"
                    placeholderTextColor={colors.neutral[400]}
                    autoCapitalize="words"
                    textContentType="none"
                    autoComplete="off"
                    returnKeyType="next"
                    editable={!isLoading}
                    style={[styles.input, { color: colors.neutral[900] }]}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                  שם משפחה
                </Text>
                <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                    <User size={18} color={colors.neutral[500]} />
                  </View>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="הזן שם משפחה"
                    placeholderTextColor={colors.neutral[400]}
                    autoCapitalize="words"
                    textContentType="none"
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    editable={!isLoading}
                    style={[styles.input, { color: colors.neutral[900] }]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Phone */}
          {step === 3 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                  מספר טלפון
                </Text>
                <View style={[styles.inputRow, { borderColor: colors.neutral[200] }]}>
                  <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                    <Phone size={18} color={colors.neutral[500]} />
                  </View>
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="050-0000000"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="phone-pad"
                    textContentType="none"
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    editable={!isLoading}
                    style={[styles.input, { color: colors.neutral[900] }]}
                  />
                </View>
              </View>

              <Text style={[styles.hintText, { color: colors.neutral[400] }]}>
                מספר הטלפון ישמש ליצירת קשר בנוגע לפרויקטים
              </Text>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionSection}>
            <Pressable
              onPress={step < TOTAL_STEPS ? handleNext : handleRegister}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.primary[600],
                  opacity: pressed || isLoading ? 0.8 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.actionButtonContent}>
                  <Text style={styles.actionButtonText}>
                    {step < TOTAL_STEPS ? 'המשך' : 'צור חשבון'}
                  </Text>
                  {step < TOTAL_STEPS && (
                    <ChevronLeft size={20} color="#FFFFFF" />
                  )}
                </View>
              )}
            </Pressable>
          </View>

          {/* Login Link */}
          {step === 1 && (
            <View style={styles.loginSection}>
              <Text style={[styles.loginPrompt, { color: colors.neutral[500] }]}>
                כבר יש לך חשבון?
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={[styles.loginLink, { color: colors.primary[600] }]}>
                  התחבר
                </Text>
              </Pressable>
            </View>
          )}
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
  headerSubtitle: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 2,
  },

  // Progress
  progressContainer: {
    height: 3,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
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
  hintText: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },

  // Action
  actionSection: {
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Login link
  loginSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  loginPrompt: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
