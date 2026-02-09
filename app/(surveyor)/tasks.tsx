import React from 'react';
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
  FolderOpen,
  FileText,
  Clock,
  PlayCircle,
  ChevronLeft,
  PartyPopper,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { useRecords } from '@/api/hooks/useRecords';
import { useProjects } from '@/api/hooks/useProjects';
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
 * Tasks Screen
 * Shows all pending records across all projects for the surveyor
 */
export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: records,
    isLoading,
    refetch,
  } = useRecords({
    assigneeId: user?.id,
    status: ['not_started', 'in_progress'],
  });

  const { data: projects } = useProjects();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Group records by project
  const recordsByProject = React.useMemo(() => {
    const grouped = new Map<string, typeof records>();

    records?.forEach((record) => {
      if (!grouped.has(record.projectId)) {
        grouped.set(record.projectId, []);
      }
      grouped.get(record.projectId)!.push(record);
    });

    return grouped;
  }, [records]);

  const getProjectName = (projectId: string) =>
    projects?.find((p) => p.id === projectId)?.name ?? 'פרויקט';

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
        {/* Header */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.headerSection}
        >
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            משימות
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            רשומות ממתינות להשלמה
          </Text>
        </AnimatedView>

        {isLoading ? (
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
            entering={FadeInUp.duration(500).delay(200).easing(Easing.out(Easing.ease))}
            style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.success[50] }]}>
              <PartyPopper size={36} color={colors.success[500]} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
              אין משימות ממתינות!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
              כל הרשומות הושלמו. עבודה מצוינת!
            </Text>
          </AnimatedView>
        ) : (
          <View style={styles.projectGroups}>
            {Array.from(recordsByProject.entries()).map(
              ([projectId, projectRecords], groupIndex) => (
                <AnimatedView
                  key={projectId}
                  entering={FadeInUp.duration(500).delay(200 + groupIndex * 100).easing(Easing.out(Easing.ease))}
                  style={styles.projectGroup}
                >
                  {/* Project Header */}
                  <View style={styles.projectHeader}>
                    <View style={[styles.projectIconSmall, { backgroundColor: colors.primary[50] }]}>
                      <FolderOpen size={16} color={colors.primary[600]} />
                    </View>
                    <Text style={[styles.projectName, { color: colors.neutral[900] }]}>
                      {getProjectName(projectId)}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: colors.primary[50] }]}>
                      <Text style={[styles.countText, { color: colors.primary[600] }]}>
                        {projectRecords?.length ?? 0}
                      </Text>
                    </View>
                  </View>

                  {/* Records */}
                  <View style={styles.recordsList}>
                    {projectRecords?.map((record, recordIndex) => {
                      const statusStyle = statusColors[record.status] || statusColors.not_started;
                      const StatusIcon = record.status === 'in_progress' ? PlayCircle : Clock;

                      return (
                        <Pressable
                          key={record.id}
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
                            <Text style={[styles.recordTime, { color: colors.neutral[500] }]}>
                              {formatRelativeTime(record.createdDate)}
                            </Text>
                          </View>
                          <ChevronLeft size={20} color={colors.primary[500]} />
                        </Pressable>
                      );
                    })}
                  </View>
                </AnimatedView>
              )
            )}
          </View>
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
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
    textAlign: 'right',
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
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },

  // Project Groups
  projectGroups: {
    gap: 24,
  },
  projectGroup: {},
  projectHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  projectIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Records List
  recordsList: {
    gap: 8,
  },
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
  recordTime: {
    fontSize: 13,
    textAlign: 'right',
  },
});
