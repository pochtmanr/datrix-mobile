import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, Save, Send, ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';

import { useRecord, useSubmitRecord } from '@/api/hooks/useRecords';
import { useQuestions, groupQuestionsBySection } from '@/api/hooks/useQuestions';
import { useRecordAnswers, useUpsertRecordAnswer } from '@/api/hooks/useRecordAnswers';
import { useDraftStore } from '@/store/draftStore';
import { QuestionField } from '@/components/QuestionField';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Form Filling Screen
 * Main screen for surveyors to fill out questionnaire forms
 */
export default function FormFillScreen() {
  const insets = useSafeAreaInsets();
  const { projectId, recordId } = useLocalSearchParams<{
    projectId: string;
    recordId: string;
  }>();

  // Data hooks
  const { data: record, isLoading: recordLoading } = useRecord(recordId);
  const { data: questions, isLoading: questionsLoading } = useQuestions(
    record?.questionnaireId
  );
  const { data: savedAnswers, isLoading: answersLoading } = useRecordAnswers(recordId);
  const upsertAnswer = useUpsertRecordAnswer();
  const submitRecord = useSubmitRecord();

  // Draft store
  const {
    unsavedAnswers,
    setAnswer,
    getAnswer,
    isDirty,
    setDirty,
    setLastSavedAt,
    activeSection,
    setActiveSection,
    setActiveRecord,
  } = useDraftStore();

  // Local state
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Section tabs scroll ref and layout tracking
  const sectionTabsRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});

  // Animated progress bar
  const progressWidth = useSharedValue(0);
  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Initialize draft store with record context
  useEffect(() => {
    if (record) {
      setActiveRecord(record.id, record.questionnaireId, record.projectId);
    }
  }, [record, setActiveRecord]);

  // Group questions by section
  const sections = useMemo(() => {
    if (!questions) return new Map<string, Question[]>();
    return groupQuestionsBySection(questions);
  }, [questions]);

  const sectionNames = useMemo(() => Array.from(sections.keys()), [sections]);
  const currentSectionName = sectionNames[activeSection] ?? '';
  const currentQuestions = sections.get(currentSectionName) ?? [];

  // Animate progress bar and scroll section tabs into view
  useEffect(() => {
    if (sectionNames.length > 0) {
      const pct = ((activeSection + 1) / sectionNames.length) * 100;
      progressWidth.value = withTiming(pct, { duration: 300 });
    }

    // Auto-scroll section tab into view
    const layout = tabLayouts.current[activeSection];
    if (layout && sectionTabsRef.current) {
      sectionTabsRef.current.scrollTo({
        x: Math.max(0, layout.x - 16),
        animated: true,
      });
    }
  }, [activeSection, sectionNames.length, progressWidth]);

  // Get answer value (check unsaved first, then saved)
  const getAnswerValue = useCallback(
    (questionId: string, pageId?: string | null): AnswerValue => {
      // Check unsaved answers first
      const unsavedValue = getAnswer(questionId, pageId);
      if (unsavedValue !== undefined) {
        return unsavedValue;
      }

      // Check saved answers
      const saved = savedAnswers?.find(
        (a) => a.questionId === questionId && a.pageId === (pageId ?? null)
      );
      if (saved?.value) {
        try {
          return JSON.parse(saved.value);
        } catch {
          return saved.value;
        }
      }

      return null;
    },
    [getAnswer, savedAnswers]
  );

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionId: string, value: AnswerValue, pageId?: string | null) => {
      setAnswer(questionId, value, pageId);
    },
    [setAnswer]
  );

  // Validate required fields
  const validateAnswers = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    questions?.forEach((question) => {
      if (question.isRequired) {
        const value = getAnswerValue(question.id);
        if (value === null || value === undefined || value === '') {
          newErrors[question.id] = 'שדה חובה';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [questions, getAnswerValue]);

  // Save all unsaved answers
  const handleSave = useCallback(async () => {
    if (!recordId || Object.keys(unsavedAnswers).length === 0) return;

    setIsSaving(true);
    try {
      const promises = Object.entries(unsavedAnswers).map(([key, value]) => {
        const [questionId, pageId] = key.split('_');
        return upsertAnswer.mutateAsync({
          recordId,
          questionId,
          pageId: pageId === 'default' ? null : pageId,
          value: JSON.stringify(value),
          displayValue:
            typeof value === 'string'
              ? value
              : Array.isArray(value)
                ? value.join(', ')
                : String(value),
        });
      });

      await Promise.all(promises);
      setLastSavedAt(new Date());
      setDirty(false);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('שגיאה', 'שגיאה בשמירת התשובות');
    } finally {
      setIsSaving(false);
    }
  }, [recordId, unsavedAnswers, upsertAnswer, setLastSavedAt, setDirty]);

  // Submit the form
  const handleSubmit = useCallback(async () => {
    // Validate first
    if (!validateAnswers()) {
      Alert.alert('שדות חסרים', 'יש למלא את כל שדות החובה לפני שליחה');
      return;
    }

    // Save any unsaved answers first
    if (isDirty) {
      await handleSave();
    }

    setIsSubmitting(true);
    try {
      await submitRecord.mutateAsync(recordId!);
      Alert.alert('הצלחה', 'הסקר נשלח בהצלחה', [
        {
          text: 'אישור',
          onPress: () => router.replace(`/(surveyor)/projects/${projectId}` as const),
        },
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('שגיאה', 'שגיאה בשליחת הסקר');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAnswers, isDirty, handleSave, submitRecord, recordId, projectId]);

  // Handle back navigation with unsaved changes warning
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert('שינויים לא נשמרו', 'יש לך שינויים שלא נשמרו. האם לשמור לפני יציאה?', [
        {
          text: 'צא ללא שמירה',
          style: 'destructive',
          onPress: () => router.back(),
        },
        {
          text: 'שמור וצא',
          onPress: async () => {
            await handleSave();
            router.back();
          },
        },
        { text: 'ביטול', style: 'cancel' },
      ]);
    } else {
      router.back();
    }
  }, [isDirty, handleSave]);

  // Navigate between sections
  const goToNextSection = () => {
    if (activeSection < sectionNames.length - 1) {
      setActiveSection(activeSection + 1);
    }
  };

  const goToPrevSection = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
    }
  };

  const isLoading = recordLoading || questionsLoading || answersLoading;
  const isLastSection = activeSection === sectionNames.length - 1;
  const isFirstSection = activeSection === 0;

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
        <StatusBar style="dark" />
        <View style={[styles.loadingWrapper, { paddingTop: insets.top + 20 }]}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { backgroundColor: colors.neutral[200] }]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 12, backgroundColor: '#FFFFFF', borderColor },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: colors.neutral[100] }]}
            >
              <ArrowRight size={20} color={colors.primary[600]} />
            </Pressable>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
                מילוי שאלון
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
                #{record?.externalId ?? record?.id.slice(-8)}
              </Text>
            </View>

            {/* Save indicator */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !isDirty}
              hitSlop={8}
              style={({ pressed }) => [
                styles.saveIndicator,
                isDirty && {
                  backgroundColor: colors.warning[50],
                  borderColor: colors.warning[300],
                  borderWidth: 1,
                },
                pressed && isDirty && { opacity: 0.7 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.primary[600]} size="small" />
              ) : isDirty ? (
                <View style={styles.unsavedBadge}>
                  <View style={[styles.unsavedDot, { backgroundColor: colors.warning[500] }]} />
                  <Text style={[styles.unsavedText, { color: colors.warning[600] }]}>
                    שמור
                  </Text>
                </View>
              ) : (
                <Text style={[styles.savedText, { color: colors.success[600] }]}>
                  נשמר
                </Text>
              )}
            </Pressable>
          </View>

          {/* Section tabs */}
          {sectionNames.length > 1 && (
            <ScrollView
              ref={sectionTabsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sectionTabs}
              contentContainerStyle={styles.sectionTabsContent}
            >
              {sectionNames.map((name, index) => (
                <Pressable
                  key={name}
                  onPress={() => setActiveSection(index)}
                  onLayout={(e: LayoutChangeEvent) => {
                    tabLayouts.current[index] = {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    };
                  }}
                  style={[
                    styles.sectionTab,
                    {
                      backgroundColor:
                        index === activeSection ? colors.primary[600] : colors.neutral[100],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTabText,
                      { color: index === activeSection ? '#FFFFFF' : colors.neutral[600] },
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Progress indicator */}
        <View style={[styles.progressContainer, { backgroundColor: '#FFFFFF', borderColor }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.neutral[500] }]}>
              {activeSection + 1} / {sectionNames.length}
            </Text>
            <Text style={[styles.sectionName, { color: colors.neutral[900] }]}>
              {currentSectionName}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.neutral[200] }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary[600] },
                animatedProgressStyle,
              ]}
            />
          </View>
        </View>

        {/* Form content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 170,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentQuestions.length === 0 ? (
            <AnimatedView
              entering={FadeInUp.duration(400).easing(Easing.out(Easing.ease))}
              style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
                <FileText size={28} color={colors.neutral[400]} />
              </View>
              <Text style={[styles.emptyText, { color: colors.neutral[500] }]}>
                אין שאלות בחלק זה
              </Text>
            </AnimatedView>
          ) : (
            currentQuestions.map((question, index) => (
              <AnimatedView
                key={question.id}
                entering={FadeInUp.duration(300).delay(index * 50).easing(Easing.out(Easing.ease))}
              >
                <QuestionField
                  question={question}
                  value={getAnswerValue(question.id)}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                  recordId={recordId!}
                  pageId={null}
                  error={errors[question.id]}
                />
              </AnimatedView>
            ))
          )}
        </ScrollView>

        {/* Bottom navigation */}
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: '#FFFFFF', borderColor, paddingBottom: insets.bottom + 65 },
          ]}
        >
          <View style={styles.navButtons}>
            {!isFirstSection && (
              <Pressable
                onPress={goToPrevSection}
                style={({ pressed }) => [
                  styles.navButton,
                  styles.navButtonOutline,
                  { borderColor: colors.primary[600], opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ChevronRight size={20} color={colors.primary[600]} />
                <Text style={[styles.navButtonText, { color: colors.primary[600] }]}>
                  הקודם
                </Text>
              </Pressable>
            )}

            {isLastSection ? (
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.navButton,
                  styles.navButtonPrimary,
                  { backgroundColor: colors.primary[600], opacity: pressed || isSubmitting ? 0.8 : 1 },
                  isFirstSection && styles.navButtonFull,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.navButtonTextWhite}>שולח...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Send size={20} color="#FFFFFF" />
                    <Text style={styles.navButtonTextWhite}>שלח סקר</Text>
                  </View>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={goToNextSection}
                style={({ pressed }) => [
                  styles.navButton,
                  styles.navButtonPrimary,
                  { backgroundColor: colors.primary[600], opacity: pressed ? 0.7 : 1 },
                  isFirstSection && styles.navButtonFull,
                ]}
              >
                <Text style={styles.navButtonTextWhite}>הבא</Text>
                <ChevronLeft size={20} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Loading
  loadingWrapper: {
    padding: 20,
    gap: 16,
  },
  skeletonCard: {
    height: 80,
    borderRadius: 16,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
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
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 13,
    textAlign: 'right',
  },
  saveIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsavedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unsavedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  savedText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Section tabs
  sectionTabs: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  sectionTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Content
  scrollView: {
    flex: 1,
  },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },

  // Bottom navigation
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  navButtonFull: {
    flex: 1,
  },
  navButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  navButtonPrimary: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
});
