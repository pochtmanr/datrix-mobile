import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  FolderOpen,
  Search,
  ChevronLeft,
  CheckCircle,
  Clock,
} from 'lucide-react-native';

import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { colors } from '@/theme/colors';
import { layout, typography } from '@/components/layout/styles';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Projects List Screen
 * Shows all projects with record statistics
 */
export default function ManagerProjectsListScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: projects,
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();

  const { data: allRecords, refetch: refetchRecords } = useRecords();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchRecords()]);
    setRefreshing(false);
  }, [refetchProjects, refetchRecords]);

  // Filter projects by search query
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.code?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Get stats per project
  const getProjectStats = (projectId: string) => {
    const projectRecords = allRecords?.filter((r) => r.projectId === projectId) ?? [];
    const total = projectRecords.length;
    const completed = projectRecords.filter(
      (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
    ).length;
    const pending = projectRecords.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, rate };
  };

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
          <Text style={typography.screenTitle}>פרויקטים</Text>
          <Text style={typography.screenSubtitle}>
            {projects?.length ?? 0} פרויקטים פעילים
          </Text>
        </AnimatedView>

        {/* Search */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={s.searchSection}
        >
          <View style={layout.searchBox}>
            <Search size={20} color={colors.neutral[400]} />
            <TextInput
              placeholder="חיפוש פרויקט..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[layout.searchInput, { color: colors.neutral[900] }]}
            />
          </View>
        </AnimatedView>

        {projectsLoading ? (
          <View style={s.gap12}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={layout.skeletonCardTall} />
            ))}
          </View>
        ) : filteredProjects.length === 0 ? (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
            style={[layout.emptyState, { padding: 40 }]}
          >
            <View style={[layout.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
              <FolderOpen size={32} color={colors.neutral[400]} />
            </View>
            <Text style={[typography.emptyTitle, { fontSize: 18, marginBottom: 8 }]}>
              {searchQuery ? 'לא נמצאו תוצאות' : 'אין פרויקטים'}
            </Text>
            <Text style={typography.emptySubtitle}>
              {searchQuery ? 'נסה לחפש מילה אחרת' : 'צור פרויקט חדש להתחיל'}
            </Text>
          </AnimatedView>
        ) : (
          <View style={s.gap12}>
            {filteredProjects.map((project, index) => {
              const stats = getProjectStats(project.id);

              return (
                <AnimatedView
                  key={project.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 80).easing(Easing.out(Easing.ease))}
                >
                  <Link
                    href={`/(manager)/projects/${project.id}` as const}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => [
                        layout.listItem,
                        { padding: 16, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={[s.projectIcon, { backgroundColor: colors.primary[50] }]}>
                        <FolderOpen size={22} color={colors.primary[600]} />
                      </View>
                      <View style={layout.listItemContent}>
                        <View style={[layout.row, { gap: 8, marginBottom: 4 }]}>
                          <Text style={s.projectName}>{project.name}</Text>
                          {project.code && (
                            <View style={[s.codeBadge, { backgroundColor: colors.primary[50] }]}>
                              <Text style={[s.codeText, { color: colors.primary[600] }]}>
                                {project.code}
                              </Text>
                            </View>
                          )}
                        </View>
                        {project.description && (
                          <Text
                            style={[typography.caption, { textAlign: 'right', marginBottom: 10 }]}
                            numberOfLines={1}
                          >
                            {project.description}
                          </Text>
                        )}

                        {/* Stats */}
                        <View style={[layout.row, { gap: 16, marginBottom: 10 }]}>
                          <View style={[layout.row, { gap: 4 }]}>
                            <Text style={s.statValue}>{stats.total}</Text>
                            <Text style={typography.caption}>רשומות</Text>
                          </View>
                          <View style={[layout.row, { gap: 4 }]}>
                            <CheckCircle size={14} color={colors.success[600]} />
                            <Text style={[s.statValue, { color: colors.success[600] }]}>
                              {stats.completed}
                            </Text>
                          </View>
                          <View style={[layout.row, { gap: 4 }]}>
                            <Clock size={14} color={colors.warning[600]} />
                            <Text style={[s.statValue, { color: colors.warning[600] }]}>
                              {stats.pending}
                            </Text>
                          </View>
                        </View>

                        {/* Progress bar */}
                        <View style={[layout.progressBarThin, { width: '100%' }]}>
                          <View
                            style={[
                              layout.progressFillThin,
                              { backgroundColor: colors.success[500], width: `${stats.rate}%` },
                            ]}
                          />
                        </View>
                      </View>
                      <ChevronLeft size={20} color={colors.neutral[400]} />
                    </Pressable>
                  </Link>
                </AnimatedView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Screen-specific styles only */
const s = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerSection: {
    marginBottom: 20,
  },
  searchSection: {
    marginBottom: 20,
  },
  gap12: {
    gap: 12,
  },
  projectIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});
