import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  ArrowRight,
  FolderOpen,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { RECORD_STATUS_LABELS } from '@/lib/constants';
import { colors } from '@/theme/colors';
import type { RecordStatus } from '@/lib/types';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Reports Screen (profile sub-screen)
 * Displays aggregated stats strictly scoped to projects assigned to the manager.
 * useProjects() already filters by manager's project_users assignments.
 * Records are filtered to only include those within the manager's projects.
 */
export default function ManagerProfileReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: allRecords, isLoading: recordsLoading, refetch: refetchRecords } = useRecords();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchRecords()]);
    setRefreshing(false);
  }, [refetchProjects, refetchRecords]);

  // Scope records to only the manager's projects
  const projectIds = useMemo(() => new Set(projects?.map((p) => p.id) ?? []), [projects]);

  const scopedRecords = useMemo(() => {
    if (!allRecords || projectIds.size === 0) return [];
    return allRecords.filter((r) => projectIds.has(r.projectId));
  }, [allRecords, projectIds]);

  // Calculate KPIs from scoped data only
  const stats = useMemo(() => {
    const total = scopedRecords.length;
    const completed = scopedRecords.filter(
      (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
    ).length;
    const pending = scopedRecords.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length;
    const qualityControlled = scopedRecords.filter(
      (r) => r.status === 'passed_quality_control'
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, qualityControlled, completionRate };
  }, [scopedRecords]);

  // Status distribution from scoped records
  const statusCounts = useMemo(() => {
    return scopedRecords.reduce(
      (acc, record) => {
        acc[record.status] = (acc[record.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [scopedRecords]);

  // Per-project breakdown
  const projectBreakdown = useMemo(() => {
    if (!projects) return [];
    return projects.map((project) => {
      const records = scopedRecords.filter((r) => r.projectId === project.id);
      const total = records.length;
      const completed = records.filter(
        (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
      ).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...project, totalRecords: total, completedRecords: completed, completionRate: rate };
    });
  }, [projects, scopedRecords]);

  const isLoading = projectsLoading || recordsLoading;
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
            דוחות הפרויקטים שלי
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            סטטיסטיקות מוגבלות לפרויקטים שלך בלבד
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* KPI Summary */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.kpiGrid}
        >
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
                <ActivityIndicator color={colors.neutral[400]} />
              </View>
            ))
          ) : (
            <>
              <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.primary[50] }]}>
                  <FolderOpen size={20} color={colors.primary[600]} />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.neutral[500] }]}>פרויקטים</Text>
                <Text style={[styles.kpiValue, { color: colors.neutral[900] }]}>
                  {projects?.length ?? 0}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.success[50] }]}>
                  <CheckCircle size={20} color={colors.success[600]} />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.neutral[500] }]}>הושלמו</Text>
                <View style={styles.kpiRow}>
                  <Text style={[styles.kpiValue, { color: colors.success[600] }]}>
                    {stats.completed}
                  </Text>
                  <TrendingUp size={16} color={colors.success[500]} />
                </View>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.warning[50] }]}>
                  <Clock size={20} color={colors.warning[600]} />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.neutral[500] }]}>ממתינים</Text>
                <Text style={[styles.kpiValue, { color: colors.warning[600] }]}>
                  {stats.pending}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.kpiIcon, { backgroundColor: colors.neutral[100] }]}>
                  <BarChart3 size={20} color={colors.neutral[600]} />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.neutral[500] }]}>סה"כ רשומות</Text>
                <Text style={[styles.kpiValue, { color: colors.neutral[900] }]}>
                  {stats.total}
                </Text>
              </View>
            </>
          )}
        </AnimatedView>

        {/* Completion Rate */}
        {!isLoading && (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(200).easing(Easing.out(Easing.ease))}
            style={styles.section}
          >
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.primary[50] }]}>
                  <BarChart3 size={18} color={colors.primary[600]} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.neutral[900] }]}>
                  אחוז השלמה כללי
                </Text>
              </View>
              <View style={[styles.rateBetween, { marginBottom: 8 }]}>
                <Text style={[styles.rateCaption, { color: colors.neutral[500] }]}>
                  {stats.completed} מתוך {stats.total}
                </Text>
                <Text style={[styles.rateValue, { color: colors.primary[600] }]}>
                  {stats.completionRate}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary[600], width: `${stats.completionRate}%` },
                  ]}
                />
              </View>
            </View>
          </AnimatedView>
        )}

        {/* Status Distribution */}
        {!isLoading && Object.keys(statusCounts).length > 0 && (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
            style={styles.section}
          >
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.cardTitle, { color: colors.neutral[900], marginBottom: 16 }]}>
                התפלגות סטטוסים
              </Text>
              <View style={styles.statusList}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <View key={status}>
                      <View style={[styles.rateBetween, { marginBottom: 6 }]}>
                        <Text style={[styles.statusLabel, { color: colors.neutral[700] }]}>
                          {RECORD_STATUS_LABELS[status as RecordStatus] ?? status}
                        </Text>
                        <Text style={[styles.rateCaption, { fontWeight: '500' }]}>
                          {count} ({Math.round(percentage)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarThin}>
                        <View
                          style={[
                            styles.progressFillThin,
                            { backgroundColor: colors.primary[400], width: `${percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </AnimatedView>
        )}

        {/* Per-project breakdown */}
        {!isLoading && projectBreakdown.length > 0 && (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.ease))}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
              פירוט לפי פרויקט
            </Text>

            <View style={styles.projectList}>
              {projectBreakdown.map((project, idx) => (
                <AnimatedView
                  key={project.id}
                  entering={FadeInUp.duration(400).delay(500 + idx * 80).easing(Easing.out(Easing.ease))}
                >
                  <View style={[styles.projectCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.projectHeader}>
                      <View style={[styles.projectIcon, { backgroundColor: colors.primary[50] }]}>
                        <FolderOpen size={18} color={colors.primary[600]} />
                      </View>
                      <View style={styles.projectInfo}>
                        <Text style={[styles.projectName, { color: colors.neutral[900] }]}>
                          {project.name ?? 'פרויקט ללא שם'}
                        </Text>
                        <Text style={[styles.projectMeta, { color: colors.neutral[500] }]}>
                          {project.completedRecords} / {project.totalRecords} הושלמו
                        </Text>
                      </View>
                      <Text style={[styles.projectRate, { color: colors.primary[600] }]}>
                        {project.completionRate}%
                      </Text>
                    </View>
                    <View style={[styles.progressBarThin, { marginTop: 10 }]}>
                      <View
                        style={[
                          styles.progressFillThin,
                          {
                            backgroundColor: project.completionRate >= 80
                              ? colors.success[500]
                              : project.completionRate >= 50
                              ? colors.warning[500]
                              : colors.danger[400],
                            width: `${project.completionRate}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </AnimatedView>
              ))}
            </View>
          </AnimatedView>
        )}
      </ScrollView>
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

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-end',
    minHeight: 110,
    justifyContent: 'center',
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Rates
  rateBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateCaption: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  rateValue: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Progress bars
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarThin: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  progressFillThin: {
    height: '100%',
    borderRadius: 3,
  },

  // Status list
  statusList: {
    gap: 14,
  },
  statusLabel: {
    fontSize: 14,
  },

  // Project list
  projectList: {
    gap: 10,
  },
  projectCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  projectHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  projectInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 2,
  },
  projectMeta: {
    fontSize: 13,
  },
  projectRate: {
    fontSize: 20,
    fontWeight: '700',
  },
});
