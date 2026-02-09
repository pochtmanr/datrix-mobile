import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Surface, Card, Chip, Skeleton, Button } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Link } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useProject } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { useQuestionnaires } from '@/api/hooks/useQuestionnaires';
import { RECORD_STATUS_LABELS, RECORD_STATUS_COLORS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { colors } from '@/theme/colors';

function BackIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H19M12 5l7 7-7 7"
        stroke={colors.primary[600]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Manager Project Detail Screen
 * Shows project records with filtering and export options
 */
export default function ManagerProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<'records' | 'questionnaires' | 'stats'>(
    'records'
  );
  const [refreshing, setRefreshing] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: records, isLoading: recordsLoading, refetch } = useRecords({
    projectId,
  });
  const { data: questionnaires, isLoading: questionnairesLoading } =
    useQuestionnaires(projectId);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!records) return { total: 0, completed: 0, pending: 0, rate: 0 };

    const total = records.length;
    const completed = records.filter(
      (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
    ).length;
    const pending = records.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, rate };
  }, [records]);

  // Group records by status
  const recordsByStatus = React.useMemo(() => {
    if (!records) return {};
    return records.reduce(
      (acc, record) => {
        if (!acc[record.status]) acc[record.status] = [];
        acc[record.status].push(record);
        return acc;
      },
      {} as Record<string, typeof records>
    );
  }, [records]);

  const isLoading = projectLoading || recordsLoading || questionnairesLoading;

  return (
    <Surface className="flex-1 bg-background">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="border-b border-border bg-card px-4 pb-4"
      >
        <View className="flex-row-reverse items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <BackIcon />
          </Pressable>
          <View className="flex-1">
            {projectLoading ? (
              <Skeleton className="h-6 w-48 rounded" />
            ) : (
              <>
                <Text className="text-xl font-bold text-foreground">
                  {project?.name ?? 'פרויקט'}
                </Text>
                {project?.code && (
                  <Text className="text-sm text-muted-foreground">
                    קוד: {project.code}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="border-b border-border bg-card px-4">
        <View className="flex-row-reverse">
          {(['records', 'questionnaires', 'stats'] as const).map((tab) => (
            <Pressable
              key={tab}
              className={`flex-1 py-3 ${
                activeTab === tab ? 'border-b-2 border-primary' : ''
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === tab ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab === 'records'
                  ? `רשומות (${records?.length ?? 0})`
                  : tab === 'questionnaires'
                    ? `שאלונים (${questionnaires?.length ?? 0})`
                    : 'סטטיסטיקות'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'stats' ? (
          // Stats Tab
          <>
            {/* Summary Cards */}
            <View className="mb-6 flex-row-reverse flex-wrap gap-3">
              <Card className="p-4" style={{ minWidth: '45%', flex: 1 }}>
                <Text className="text-sm text-muted-foreground">סה"כ רשומות</Text>
                <Text className="mt-1 text-3xl font-bold text-foreground">
                  {stats.total}
                </Text>
              </Card>

              <Card className="p-4" style={{ minWidth: '45%', flex: 1 }}>
                <Text className="text-sm text-muted-foreground">הושלמו</Text>
                <Text className="mt-1 text-3xl font-bold text-success-600">
                  {stats.completed}
                </Text>
              </Card>

              <Card className="p-4" style={{ minWidth: '45%', flex: 1 }}>
                <Text className="text-sm text-muted-foreground">ממתינים</Text>
                <Text className="mt-1 text-3xl font-bold text-warning-600">
                  {stats.pending}
                </Text>
              </Card>

              <Card className="p-4" style={{ minWidth: '45%', flex: 1 }}>
                <Text className="text-sm text-muted-foreground">אחוז השלמה</Text>
                <Text className="mt-1 text-3xl font-bold text-primary">
                  {stats.rate}%
                </Text>
              </Card>
            </View>

            {/* Status Distribution */}
            <Card className="p-4">
              <Text className="mb-4 text-base font-semibold text-foreground">
                התפלגות לפי סטטוס
              </Text>
              {Object.entries(recordsByStatus).map(([status, statusRecords]) => {
                const percentage =
                  stats.total > 0
                    ? ((statusRecords?.length ?? 0) / stats.total) * 100
                    : 0;
                return (
                  <View key={status} className="mb-3">
                    <View className="flex-row-reverse items-center justify-between">
                      <Text className="text-sm text-foreground">
                        {RECORD_STATUS_LABELS[
                          status as keyof typeof RECORD_STATUS_LABELS
                        ] ?? status}
                      </Text>
                      <Text className="text-sm font-medium text-muted-foreground">
                        {statusRecords?.length ?? 0} ({Math.round(percentage)}%)
                      </Text>
                    </View>
                    <View className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200">
                      <View
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${percentage}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        ) : activeTab === 'questionnaires' ? (
          // Questionnaires Tab
          <>
            {questionnairesLoading ? (
              <View className="gap-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </View>
            ) : questionnaires?.length === 0 ? (
              <Card className="items-center justify-center p-8">
                <Text className="text-4xl">📝</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                  אין שאלונים בפרויקט זה
                </Text>
              </Card>
            ) : (
              <View className="gap-3">
                {questionnaires?.map((questionnaire) => {
                  const qRecords =
                    records?.filter(
                      (r) => r.questionnaireId === questionnaire.id
                    ).length ?? 0;

                  return (
                    <Card key={questionnaire.id} className="p-4">
                      <View className="flex-row-reverse items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-foreground">
                            {questionnaire.name}
                          </Text>
                          {questionnaire.description && (
                            <Text
                              className="mt-1 text-sm text-muted-foreground"
                              numberOfLines={2}
                            >
                              {questionnaire.description}
                            </Text>
                          )}
                          <Text className="mt-2 text-sm text-muted-foreground">
                            {qRecords} רשומות
                          </Text>
                        </View>
                        <Chip
                          variant="soft"
                          color={
                            questionnaire.status === 'active' ? 'success' : 'warning'
                          }
                          size="sm"
                        >
                          {questionnaire.status === 'active' ? 'פעיל' : 'טיוטה'}
                        </Chip>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          // Records Tab
          <>
            {recordsLoading ? (
              <View className="gap-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </View>
            ) : records?.length === 0 ? (
              <Card className="items-center justify-center p-8">
                <Text className="text-4xl">📋</Text>
                <Text className="mt-2 text-center text-muted-foreground">
                  אין רשומות בפרויקט זה
                </Text>
              </Card>
            ) : (
              <View className="gap-3">
                {records?.map((record) => (
                  <Card key={record.id} className="p-4">
                    <View className="flex-row-reverse items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row-reverse items-center gap-2">
                          <Text className="font-semibold text-foreground">
                            #{record.externalId ?? record.id.slice(-8)}
                          </Text>
                          <Chip
                            variant="soft"
                            color={RECORD_STATUS_COLORS[record.status]}
                            size="sm"
                          >
                            {RECORD_STATUS_LABELS[record.status]}
                          </Chip>
                        </View>
                        <Text className="mt-1 text-sm text-muted-foreground">
                          {formatRelativeTime(record.createdDate)}
                          {record.area && ` · ${record.area}`}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Surface>
  );
}
