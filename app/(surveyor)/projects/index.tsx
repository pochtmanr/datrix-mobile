import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  FolderOpen,
  Search,
  ChevronLeft,
} from 'lucide-react-native';

import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { useAuth } from '@/auth';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Projects List Screen
 * Shows all projects assigned to the surveyor
 */
export default function ProjectsListScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');

  const {
    data: projects,
    isLoading,
    refetch,
  } = useProjects();

  const { data: records } = useRecords({ assigneeId: user?.id });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

  // Get record counts per project
  const getProjectStats = (projectId: string) => {
    const projectRecords = records?.filter((r) => r.projectId === projectId) ?? [];
    const pending = projectRecords.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length;
    return { total: projectRecords.length, pending };
  };

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
            פרויקטים
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            {projects?.length ?? 0} פרויקטים מוקצים
          </Text>
        </AnimatedView>

        {/* Search */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.searchContainer}
        >
          <View style={[styles.searchBox, { backgroundColor: '#FFFFFF', borderColor }]}>
            <Search size={20} color={colors.neutral[400]} />
            <TextInput
              placeholder="חיפוש פרויקט..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.neutral[900] }]}
            />
          </View>
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
        ) : filteredProjects.length === 0 ? (
          <AnimatedView
            entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
            style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
              <FolderOpen size={32} color={colors.neutral[400]} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
              {searchQuery ? 'לא נמצאו תוצאות' : 'אין פרויקטים מוקצים'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
              {searchQuery
                ? 'נסה לחפש מילה אחרת'
                : 'פנה למנהל המערכת להקצאת פרויקטים'}
            </Text>
          </AnimatedView>
        ) : (
          <View style={[styles.projectsCard, { backgroundColor: cardBg, borderColor }]}>
            {filteredProjects.map((project, index) => {
              const stats = getProjectStats(project.id);

              return (
                <AnimatedView
                  key={project.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 80).easing(Easing.out(Easing.ease))}
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
                      <View style={styles.projectHeader}>
                        <Text style={[styles.projectName, { color: colors.neutral[900] }]}>
                          {project.name}
                        </Text>
                        {project.code && (
                          <View style={[styles.codeBadge, { backgroundColor: colors.primary[50] }]}>
                            <Text style={[styles.codeText, { color: colors.primary[600] }]}>
                              {project.code}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.projectStats, { color: colors.neutral[500] }]}>
                        {stats.total} רשומות
                        {stats.pending > 0 && (
                          <Text style={{ color: colors.warning[500] }}>
                            {' '}· {stats.pending} ממתינים
                          </Text>
                        )}
                      </Text>
                      {project.description && (
                        <Text
                          style={[styles.projectDescription, { color: colors.neutral[400] }]}
                          numberOfLines={1}
                        >
                          {project.description}
                        </Text>
                      )}
                    </View>
                    <ChevronLeft size={20} color={colors.neutral[400]} />
                  </Pressable>
                  {index < filteredProjects.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.neutral[100] }]} />
                  )}
                </AnimatedView>
              );
            })}
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
    marginBottom: 20,
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

  // Search
  searchContainer: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
  },

  // Loading
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 88,
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
    fontSize: 18,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  projectHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectStats: {
    fontSize: 13,
    textAlign: 'right',
  },
  projectDescription: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'right',
  },
});
