import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import { ArrowRight, Check, ClipboardList } from 'lucide-react-native';

import { useQuestionnaires } from '@/api/hooks/useQuestionnaires';
import { useCreateRecord } from '@/api/hooks/useRecords';
import { useAuth } from '@/auth';
import { colors } from '@/theme/colors';
import { useDraftStore } from '@/store/draftStore';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * New Record Screen
 * Allows surveyor to select a questionnaire and create a new record
 */
export default function NewRecordScreen() {
  const insets = useSafeAreaInsets();
  const { projectId, questionnaireId: preselectedId } = useLocalSearchParams<{
    projectId: string;
    questionnaireId?: string;
  }>();
  const { user } = useAuth();
  const setActiveRecord = useDraftStore((s) => s.setActiveRecord);

  const { data: questionnaires, isLoading } = useQuestionnaires(projectId);
  const createRecord = useCreateRecord();

  const [selectedId, setSelectedId] = useState<string | null>(preselectedId ?? null);
  const [isCreating, setIsCreating] = useState(false);

  const handleStart = async () => {
    if (!selectedId || !user?.id) return;

    setIsCreating(true);
    try {
      const record = await createRecord.mutateAsync({
        projectId,
        questionnaireId: selectedId,
        assigneeId: user.id,
        hasQuestionnaire: true,
      });

      // Set active record in draft store
      setActiveRecord(record.id, selectedId, projectId);

      // Navigate to fill screen
      router.replace(
        `/(surveyor)/projects/${projectId}/records/${record.id}/fill` as const
      );
    } catch (error) {
      console.error('Failed to create record:', error);
      setIsCreating(false);
    }
  };

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: '#FFFFFF', borderColor },
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
            סקר חדש
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            בחר שאלון להתחלת סקר
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 170,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.skeletonCard, { backgroundColor: colors.neutral[200] }]}
              />
            ))}
          </View>
        ) : questionnaires?.length === 0 ? (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(100).easing(Easing.out(Easing.ease))}
            style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
              <ClipboardList size={32} color={colors.neutral[400]} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
              אין שאלונים זמינים
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
              אין שאלונים זמינים בפרויקט זה
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                { borderColor: colors.primary[600], opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.backBtnText, { color: colors.primary[600] }]}>
                חזור
              </Text>
            </Pressable>
          </AnimatedView>
        ) : (
          <>
            <AnimatedView
              entering={FadeInDown.duration(400).delay(100).easing(Easing.out(Easing.ease))}
            >
              <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
                שאלונים זמינים ({questionnaires?.length})
              </Text>
            </AnimatedView>

            <View style={styles.questionnairesList}>
              {questionnaires?.map((questionnaire, index) => {
                const isSelected = selectedId === questionnaire.id;
                return (
                  <AnimatedView
                    key={questionnaire.id}
                    entering={FadeInUp.duration(400).delay(150 + index * 80).easing(Easing.out(Easing.ease))}
                  >
                    <Pressable
                      onPress={() => setSelectedId(questionnaire.id)}
                      style={({ pressed }) => [
                        styles.questionnaireCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: isSelected ? colors.primary[500] : borderColor,
                          borderWidth: isSelected ? 2 : 1,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={styles.questionnaireContent}>
                        <View style={[styles.questionnaireIcon, { backgroundColor: colors.primary[50] }]}>
                          <ClipboardList size={22} color={colors.primary[600]} />
                        </View>
                        <View style={styles.questionnaireInfo}>
                          <Text style={[styles.questionnaireName, { color: colors.neutral[900] }]}>
                            {questionnaire.name}
                          </Text>
                          {questionnaire.description && (
                            <Text
                              style={[styles.questionnaireDescription, { color: colors.neutral[500] }]}
                              numberOfLines={2}
                            >
                              {questionnaire.description}
                            </Text>
                          )}
                          {questionnaire.code && (
                            <Text style={[styles.questionnaireCode, { color: colors.neutral[400] }]}>
                              קוד: {questionnaire.code}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <View style={[styles.checkIcon, { backgroundColor: colors.primary[600] }]}>
                            <Check size={18} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </AnimatedView>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Start Button */}
      {selectedId && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: '#FFFFFF', borderColor, paddingBottom: insets.bottom + 65 },
          ]}
        >
          <Pressable
            onPress={handleStart}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.primary[600], opacity: pressed || isCreating ? 0.8 : 1 },
            ]}
          >
            {isCreating ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.startButtonText}>יוצר סקר...</Text>
              </View>
            ) : (
              <Text style={styles.startButtonText}>התחל סקר</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'right',
    marginTop: 2,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 100,
    borderRadius: 16,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
  },

  // Empty State
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Questionnaires List
  questionnairesList: {
    gap: 10,
  },
  questionnaireCard: {
    borderRadius: 16,
    padding: 16,
  },
  questionnaireContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  questionnaireIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  questionnaireName: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 4,
  },
  questionnaireDescription: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 4,
  },
  questionnaireCode: {
    fontSize: 12,
    textAlign: 'right',
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
