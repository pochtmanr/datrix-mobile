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
import { Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  FolderOpen,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronLeft,
  BarChart3,
} from 'lucide-react-native';

import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { useAuth } from '@/auth';
import { RECORD_STATUS_LABELS } from '@/lib/constants';
import { colors } from '@/theme/colors';
import { layout, typography } from '@/components/layout/styles';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Dashboard Screen
 * Shows KPIs, charts, and project overview
 */
export default function ManagerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: projects,
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();

  const {
    data: allRecords,
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = useRecords();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchRecords()]);
    setRefreshing(false);
  }, [refetchProjects, refetchRecords]);

  // Calculate KPIs
  const totalProjects = projects?.length ?? 0;
  const totalRecords = allRecords?.length ?? 0;
  const completedRecords =
    allRecords?.filter(
      (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
    ).length ?? 0;
  const pendingRecords =
    allRecords?.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length ?? 0;
  const completionRate =
    totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0;

  // Status distribution
  const statusCounts = React.useMemo(() => {
    if (!allRecords) return {};
    return allRecords.reduce(
      (acc, record) => {
        acc[record.status] = (acc[record.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [allRecords]);

  const isLoading = projectsLoading || recordsLoading;

  return (
    <View style={layout.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={s.flex}
        contentContainerStyle={[
          layout.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={s.headerSection}
        >
          <Text style={typography.screenTitle}>לוח בקרה</Text>
          <Text style={typography.screenSubtitle}>
            שלום, {user?.fullName ?? user?.firstName ?? 'מנהל'}
          </Text>
        </AnimatedView>

        {/* KPI Cards */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={layout.kpiGrid}
        >
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[layout.kpiCard, s.kpiCardLoading]}>
                  <ActivityIndicator color={colors.neutral[400]} />
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={layout.kpiCard}>
                <View style={[layout.kpiIcon, { backgroundColor: colors.primary[50] }]}>
                  <FolderOpen size={20} color={colors.primary[600]} />
                </View>
                <Text style={typography.kpiLabel}>סה"כ פרויקטים</Text>
                <Text style={[typography.kpiValue, { color: colors.neutral[900] }]}>
                  {totalProjects}
                </Text>
              </View>

              <View style={layout.kpiCard}>
                <View style={[layout.kpiIcon, { backgroundColor: colors.neutral[100] }]}>
                  <FileText size={20} color={colors.neutral[600]} />
                </View>
                <Text style={typography.kpiLabel}>סה"כ רשומות</Text>
                <Text style={[typography.kpiValue, { color: colors.neutral[900] }]}>
                  {totalRecords}
                </Text>
              </View>

              <View style={layout.kpiCard}>
                <View style={[layout.kpiIcon, { backgroundColor: colors.success[50] }]}>
                  <CheckCircle size={20} color={colors.success[600]} />
                </View>
                <Text style={typography.kpiLabel}>הושלמו</Text>
                <View style={[layout.row, { gap: 8 }]}>
                  <Text style={[typography.kpiValue, { color: colors.success[600] }]}>
                    {completedRecords}
                  </Text>
                  <TrendingUp size={16} color={colors.success[500]} />
                </View>
              </View>

              <View style={layout.kpiCard}>
                <View style={[layout.kpiIcon, { backgroundColor: colors.warning[50] }]}>
                  <Clock size={20} color={colors.warning[600]} />
                </View>
                <Text style={typography.kpiLabel}>ממתינים</Text>
                <Text style={[typography.kpiValue, { color: colors.warning[600] }]}>
                  {pendingRecords}
                </Text>
              </View>
            </>
          )}
        </AnimatedView>

        {/* Completion Rate */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
          style={layout.section}
        >
          <View style={layout.card}>
            <View style={layout.cardHeader}>
              <View style={[layout.cardIcon, { backgroundColor: colors.primary[50] }]}>
                <BarChart3 size={18} color={colors.primary[600]} />
              </View>
              <Text style={typography.cardTitle}>אחוז השלמה</Text>
            </View>
            <View>
              <View style={[layout.rowBetween, { marginBottom: 8 }]}>
                <Text style={typography.caption}>
                  {completedRecords} מתוך {totalRecords}
                </Text>
                <Text style={[s.completionValue, { color: colors.primary[600] }]}>
                  {completionRate}%
                </Text>
              </View>
              <View style={layout.progressBar}>
                <View
                  style={[
                    layout.progressFill,
                    { backgroundColor: colors.primary[600], width: `${completionRate}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </AnimatedView>

        {/* Status Distribution */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.ease))}
          style={layout.section}
        >
          <View style={layout.card}>
            <Text style={[typography.cardTitle, { marginBottom: 16 }]}>
              התפלגות סטטוסים
            </Text>
            {Object.entries(statusCounts).length === 0 ? (
              <Text style={s.emptyText}>אין נתונים</Text>
            ) : (
              <View style={s.statusList}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = totalRecords > 0 ? (count / totalRecords) * 100 : 0;
                  return (
                    <View key={status}>
                      <View style={[layout.rowBetween, { marginBottom: 6 }]}>
                        <Text style={[typography.body, { color: colors.neutral[700] }]}>
                          {RECORD_STATUS_LABELS[status as keyof typeof RECORD_STATUS_LABELS] ??
                            status}
                        </Text>
                        <Text style={[typography.caption, { fontWeight: '500' }]}>
                          {count} ({Math.round(percentage)}%)
                        </Text>
                      </View>
                      <View style={layout.progressBarThin}>
                        <View
                          style={[
                            layout.progressFillThin,
                            { backgroundColor: colors.primary[400], width: `${percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </AnimatedView>

        {/* Recent Projects */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(500).easing(Easing.out(Easing.ease))}
          style={layout.section}
        >
          <View style={layout.sectionHeader}>
            <Text style={typography.sectionTitle}>פרויקטים אחרונים</Text>
            <Link href="/(manager)/projects" asChild>
              <Pressable>
                <Text style={typography.sectionLink}>צפה בכל</Text>
              </Pressable>
            </Link>
          </View>

          {isLoading ? (
            <View style={s.gap12}>
              {[1, 2].map((i) => (
                <View key={i} style={layout.skeletonCard} />
              ))}
            </View>
          ) : projects?.length === 0 ? (
            <View style={layout.emptyState}>
              <View style={[layout.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
                <FolderOpen size={32} color={colors.neutral[400]} />
              </View>
              <Text style={typography.emptyTitle}>אין פרויקטים</Text>
            </View>
          ) : (
            <View style={s.gap10}>
              {projects?.slice(0, 3).map((project) => {
                const projectRecords =
                  allRecords?.filter((r) => r.projectId === project.id) ?? [];
                const completed = projectRecords.filter(
                  (r) =>
                    r.status === 'form_filled' || r.status === 'passed_quality_control'
                ).length;

                return (
                  <Link
                    key={project.id}
                    href={`/(manager)/projects/${project.id}` as const}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => [
                        layout.listItem,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={[layout.listItemIcon, { backgroundColor: colors.primary[50] }]}>
                        <FolderOpen size={20} color={colors.primary[600]} />
                      </View>
                      <View style={layout.listItemContent}>
                        <Text style={[typography.cardTitle, { marginBottom: 2 }]}>
                          {project.name}
                        </Text>
                        <Text style={typography.caption}>
                          {completed} / {projectRecords.length} הושלמו
                        </Text>
                      </View>
                      <ChevronLeft size={20} color={colors.neutral[400]} />
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          )}
        </AnimatedView>
      </ScrollView>
    </View>
  );
}

/** Screen-specific styles only — layout primitives come from shared styles */
const s = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerSection: {
    marginBottom: 24,
  },
  kpiCardLoading: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.neutral[500],
  },
  statusList: {
    gap: 14,
  },
  gap12: {
    gap: 12,
  },
  gap10: {
    gap: 10,
  },
});
