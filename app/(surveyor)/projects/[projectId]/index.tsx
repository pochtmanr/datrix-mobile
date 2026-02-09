import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  ArrowRight,
  FileText,
  ClipboardList,
  Plus,
  ChevronLeft,
  Clock,
} from 'lucide-react-native';

import { useProject } from '@/api/hooks/useProjects';
import { useQuestionnaires } from '@/api/hooks/useQuestionnaires';
import { useRecords } from '@/api/hooks/useRecords';
import { useAuth } from '@/auth';
import { RECORD_STATUS_LABELS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

// Status colors mapping
const statusColors: Record<string, { bg: string; text: string }> = {
  not_started: { bg: colors.neutral[100], text: colors.neutral[600] },
  in_progress: { bg: colors.warning[50], text: colors.warning[600] },
  form_filled: { bg: colors.success[50], text: colors.success[600] },
  handled: { bg: colors.primary[50], text: colors.primary[600] },
  sent_to_control: { bg: colors.primary[100], text: colors.primary[700] },
  passed_quality_control: { bg: colors.success[100], text: colors.success[700] },
};

/**
 * Project Detail Screen
 * Tabs: Questionnaires and Records
 */
export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'questionnaires' | 'records'>('records');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: questionnaires, isLoading: questionnairesLoading } =
    useQuestionnaires(projectId);
  const {
    data: records,
    isLoading: recordsLoading,
    refetch,
  } = useRecords({ projectId, assigneeId: user?.id });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
          {projectLoading ? (
            <View style={[styles.skeletonTitle, { backgroundColor: colors.neutral[200] }]} />
          ) : (
            <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
              {project?.name ?? 'פרויקט'}
            </Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: '#FFFFFF', borderColor }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'records' && { borderBottomColor: colors.primary[600], borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('records')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'records' ? colors.primary[600] : colors.neutral[500] },
            ]}
          >
            רשומות ({records?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'questionnaires' && { borderBottomColor: colors.primary[600], borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('questionnaires')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'questionnaires' ? colors.primary[600] : colors.neutral[500] },
            ]}
          >
            שאלונים ({questionnaires?.length ?? 0})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'questionnaires' ? (
          // Questionnaires Tab
          <>
            {questionnairesLoading ? (
              <View style={styles.loadingContainer}>
                {[1, 2].map((i) => (
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
              </AnimatedView>
            ) : (
              <View style={styles.listContainer}>
                {questionnaires?.map((questionnaire, index) => (
                  <AnimatedView
                    key={questionnaire.id}
                    entering={FadeInUp.duration(400).delay(100 + index * 80).easing(Easing.out(Easing.ease))}
                  >
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(surveyor)/projects/${projectId}/records/new?questionnaireId=${questionnaire.id}`
                        )
                      }
                      style={({ pressed }) => [
                        styles.questionnaireCard,
                        { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={[styles.questionnaireIcon, { backgroundColor: colors.primary[50] }]}>
                        <ClipboardList size={20} color={colors.primary[600]} />
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
                      </View>
                      <View style={[styles.startButton, { backgroundColor: colors.primary[600] }]}>
                        <Text style={styles.startButtonText}>התחל</Text>
                      </View>
                    </Pressable>
                  </AnimatedView>
                ))}
              </View>
            )}
          </>
        ) : (
          // Records Tab
          <>
            {recordsLoading ? (
              <View style={styles.loadingContainer}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[styles.skeletonCard, { backgroundColor: colors.neutral[200] }]}
                  />
                ))}
              </View>
            ) : records?.length === 0 ? (
              <AnimatedView
                entering={FadeInUp.duration(500).delay(100).easing(Easing.out(Easing.ease))}
                style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
              >
                <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
                  <FileText size={32} color={colors.neutral[400]} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
                  אין רשומות עדיין
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
                  לחץ על "סקר חדש" להתחיל
                </Text>
              </AnimatedView>
            ) : (
              <View style={styles.listContainer}>
                {records?.map((record, index) => {
                  const statusStyle = statusColors[record.status] || statusColors.not_started;

                  return (
                    <AnimatedView
                      key={record.id}
                      entering={FadeInUp.duration(400).delay(100 + index * 80).easing(Easing.out(Easing.ease))}
                    >
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/(surveyor)/projects/${projectId}/records/${record.id}/fill`
                          )
                        }
                        style={({ pressed }) => [
                          styles.recordCard,
                          { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <View style={[styles.recordIcon, { backgroundColor: statusStyle.bg }]}>
                          <FileText size={18} color={statusStyle.text} />
                        </View>
                        <View style={styles.recordInfo}>
                          <View style={styles.recordHeader}>
                            <Text style={[styles.recordId, { color: colors.neutral[900] }]}>
                              #{record.externalId ?? record.id.slice(-8)}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                {RECORD_STATUS_LABELS[record.status]}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.recordMeta, { color: colors.neutral[500] }]}>
                            {formatRelativeTime(record.createdDate)}
                            {record.area && ` · ${record.area}`}
                          </Text>
                        </View>
                        <ChevronLeft size={20} color={colors.neutral[400]} />
                      </Pressable>
                    </AnimatedView>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating New Survey FAB */}
      <Pressable
        onPress={() => router.push(`/(surveyor)/projects/${projectId}/records/new`)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary[600],
            bottom: insets.bottom + 80,
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.primary[900],
          },
        ]}
      >
        <Plus size={28} color="#FFFFFF" />
      </Pressable>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  skeletonTitle: {
    height: 24,
    width: 150,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 80,
    borderRadius: 16,
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
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // List
  listContainer: {
    gap: 10,
  },

  // Questionnaire Card
  questionnaireCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  questionnaireIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  questionnaireName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  questionnaireDescription: {
    fontSize: 13,
    textAlign: 'right',
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Record Card
  recordCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recordHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recordId: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordMeta: {
    fontSize: 13,
    textAlign: 'right',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
