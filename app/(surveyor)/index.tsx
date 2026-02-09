import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  CheckCircle,
  Clock,
  FolderOpen,
  RefreshCw,
  WifiOff,
  ChevronLeft,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { useSyncStore } from '@/store';
import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { colors } from '@/theme/colors';
import { RecordListSheet, type RecordListTab } from '@/components/shared/RecordListSheet';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Surveyor Dashboard
 * Shows welcome message, today's stats, and project overview
 */
export default function SurveyorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingCount = useSyncStore((state) => state.pendingCount);

  const {
    data: projects,
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();

  const {
    data: records,
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = useRecords({ assigneeId: user?.id });

  const [refreshing, setRefreshing] = React.useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetTab, setSheetTab] = useState<RecordListTab>('completed');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchRecords()]);
    setRefreshing(false);
  }, [refetchProjects, refetchRecords]);

  // Calculate stats
  const completedToday = records?.filter((r) => {
    const today = new Date().toDateString();
    return (
      r.status === 'form_filled' &&
      new Date(r.updatedAt).toDateString() === today
    );
  }).length ?? 0;

  const pendingRecords = records?.filter(
    (r) => r.status === 'in_progress' || r.status === 'not_started'
  ).length ?? 0;

  const isLoading = projectsLoading || recordsLoading;

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Offline Banner */}
        {!isOnline && (
          <AnimatedView
            entering={FadeInDown.duration(300)}
            style={[styles.offlineBanner, { backgroundColor: `${colors.warning[500]}15` }]}
          >
            <WifiOff size={18} color={colors.warning[600]} />
            <Text style={[styles.offlineText, { color: colors.warning[700] }]}>
              אין חיבור · שינויים נשמרים מקומית
            </Text>
          </AnimatedView>
        )}

        {/* Header */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.headerSection}
        >
          <Text style={[styles.greeting, { color: colors.neutral[900] }]}>
            שלום, {user?.fullName?.split(' ')[0] ?? user?.firstName ?? 'משתמש'} 👋
          </Text>
          <Text style={[styles.date, { color: colors.neutral[500] }]}>
            {new Date().toLocaleDateString('he-IL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </AnimatedView>

        {/* Stats Cards */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.statsRow}
        >
          {isLoading ? (
            <>
              <View style={[styles.statCard, styles.statCardLoading, { backgroundColor: cardBg, borderColor }]}>
                <ActivityIndicator color={colors.neutral[400]} />
              </View>
              <View style={[styles.statCard, styles.statCardLoading, { backgroundColor: cardBg, borderColor }]}>
                <ActivityIndicator color={colors.neutral[400]} />
              </View>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  setSheetTab('completed');
                  setSheetVisible(true);
                }}
                style={({ pressed }) => [
                  styles.statCard,
                  { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.statCardTopRow}>
                  <View style={[styles.statIcon, { backgroundColor: colors.success[50] }]}>
                    <CheckCircle size={20} color={colors.success[500]} />
                  </View>
                  <ChevronLeft size={16} color={colors.neutral[300]} />
                </View>
                <Text style={[styles.statLabel, { color: colors.neutral[500] }]}>
                  הושלמו היום
                </Text>
                <Text style={[styles.statValue, { color: colors.success[600] }]}>
                  {completedToday}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSheetTab('waiting');
                  setSheetVisible(true);
                }}
                style={({ pressed }) => [
                  styles.statCard,
                  { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.statCardTopRow}>
                  <View style={[styles.statIcon, { backgroundColor: colors.warning[50] }]}>
                    <Clock size={20} color={colors.warning[500]} />
                  </View>
                  <ChevronLeft size={16} color={colors.neutral[300]} />
                </View>
                <Text style={[styles.statLabel, { color: colors.neutral[500] }]}>
                  ממתינים
                </Text>
                <Text style={[styles.statValue, { color: colors.warning[600] }]}>
                  {pendingRecords}
                </Text>
              </Pressable>
            </>
          )}
        </AnimatedView>

        {/* Pending Sync */}
        {pendingCount > 0 && (
          <AnimatedView
            entering={FadeInDown.duration(300)}
            style={[styles.syncBanner, { backgroundColor: `${colors.primary[500]}10`, borderColor: `${colors.primary[500]}20` }]}
          >
            <RefreshCw size={18} color={colors.primary[600]} />
            <Text style={[styles.syncText, { color: colors.primary[700] }]}>
              {pendingCount} פריטים ממתינים לסנכרון
            </Text>
          </AnimatedView>
        )}

        {/* Projects Section */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            הפרויקטים שלי
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.skeletonCard, { backgroundColor: colors.neutral[200] }]}
                />
              ))}
            </View>
          ) : projects?.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
                <FolderOpen size={32} color={colors.neutral[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
                אין פרויקטים מוקצים
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
                פנה למנהל המערכת להקצאת פרויקטים
              </Text>
            </View>
          ) : (
            <View style={[styles.projectsCard, { backgroundColor: cardBg, borderColor }]}>
              {projects?.slice(0, 5).map((project, index) => {
                const projectRecords = records?.filter(
                  (r) => r.projectId === project.id
                );
                const projectPending = projectRecords?.filter(
                  (r) => r.status === 'in_progress' || r.status === 'not_started'
                ).length ?? 0;
                const sliced = projects?.slice(0, 5) ?? [];

                return (
                  <AnimatedView
                    key={project.id}
                    entering={FadeInUp.duration(400).delay(400 + index * 100).easing(Easing.out(Easing.ease))}
                  >
                    <Pressable
                      onPress={() => router.push(`/(surveyor)/projects/${project.id}`)}
                      style={({ pressed }) => [
                        styles.projectRow,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={[styles.projectIcon, { backgroundColor: colors.primary[50] }]}>
                        <FolderOpen size={20} color={colors.primary[600]} />
                      </View>
                      <View style={styles.projectInfo}>
                        <Text style={[styles.projectName, { color: colors.neutral[900] }]}>
                          {project.name}
                        </Text>
                        <Text style={[styles.projectStats, { color: colors.neutral[500] }]}>
                          {projectRecords?.length ?? 0} רשומות
                          {projectPending > 0 && (
                            <Text style={{ color: colors.warning[500] }}>
                              {' '}· {projectPending} ממתינים
                            </Text>
                          )}
                        </Text>
                      </View>
                      <ChevronLeft size={20} color={colors.neutral[400]} />
                    </Pressable>
                    {index < sliced.length - 1 && (
                      <View style={[styles.separator, { backgroundColor: colors.neutral[100] }]} />
                    )}
                  </AnimatedView>
                );
              })}
            </View>
          )}
        </AnimatedView>
      </ScrollView>

      <RecordListSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        initialTab={sheetTab}
        records={records}
        projects={projects}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Offline Banner
  offlineBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  headerSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 15,
    marginTop: 4,
    textAlign: 'right',
  },

  // Stats
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-end',
  },
  statCardLoading: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Sync Banner
  syncBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  syncText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // Loading
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 72,
    borderRadius: 16,
  },

  // Empty State
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
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
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Projects Card (single card with separator rows)
  projectsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  projectRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'right',
  },
  projectStats: {
    fontSize: 13,
    textAlign: 'right',
  },
});
