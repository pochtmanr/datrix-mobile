import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  ArrowRight,
  Users,
  Search,
  User,
  Mail,
  Briefcase,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { supabase } from '@/api/supabase';
import { snakeToCamel } from '@/lib/caseUtils';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { colors } from '@/theme/colors';
import { getInitials } from '@/lib/utils';
import type { AppUser } from '@/lib/types';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Fetches team members scoped strictly to the manager's assigned projects.
 * 1. Get project IDs from project_users where user_id = managerId
 * 2. Get distinct user IDs from project_users where project_id in those projects
 * 3. Fetch user profiles for those user IDs (excluding the manager themselves)
 */
function useTeamMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async (): Promise<AppUser[]> => {
      if (!user?.id) return [];

      // Step 1: Get projects assigned to this manager
      const { data: myProjects, error: projErr } = await supabase
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);

      if (projErr) throw projErr;
      if (!myProjects?.length) return [];

      const projectIds = myProjects.map((p) => p.project_id);

      // Step 2: Get all users assigned to those projects (excluding self)
      const { data: projectMembers, error: membersErr } = await supabase
        .from('project_users')
        .select('user_id')
        .in('project_id', projectIds)
        .neq('user_id', user.id);

      if (membersErr) throw membersErr;
      if (!projectMembers?.length) return [];

      const uniqueUserIds = [...new Set(projectMembers.map((m) => m.user_id))];

      // Step 3: Fetch user profiles
      const { data: users, error: usersErr } = await supabase
        .from('app_users')
        .select('*')
        .in('id', uniqueUserIds)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (usersErr) throw usersErr;

      return users.map((u) => snakeToCamel<AppUser>(u));
    },
    enabled: !!user?.id,
  });
}

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teamMembers, isLoading, refetch } = useTeamMembers();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    if (!searchQuery.trim()) return teamMembers;

    const q = searchQuery.toLowerCase();
    return teamMembers.filter((m) =>
      (m.fullName?.toLowerCase().includes(q)) ||
      (m.firstName?.toLowerCase().includes(q)) ||
      (m.lastName?.toLowerCase().includes(q)) ||
      (m.email?.toLowerCase().includes(q)) ||
      (m.role?.toLowerCase().includes(q))
    );
  }, [teamMembers, searchQuery]);

  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, AppUser[]> = {};
    for (const member of filteredMembers) {
      const role = member.role ?? 'unknown';
      if (!groups[role]) groups[role] = [];
      groups[role].push(member);
    }
    return groups;
  }, [filteredMembers]);

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
            ניהול צוות
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            חברי הצוות בפרויקטים שלך
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
        {/* Stats bar */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={[styles.statsBar, { backgroundColor: cardBg, borderColor }]}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.primary[50] }]}>
            <Users size={20} color={colors.primary[600]} />
          </View>
          <Text style={[styles.statText, { color: colors.neutral[900] }]}>
            {teamMembers?.length ?? 0} חברי צוות
          </Text>
        </AnimatedView>

        {/* Search */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(150).easing(Easing.out(Easing.ease))}
          style={styles.searchSection}
        >
          <View style={[styles.searchBox, { borderColor }]}>
            <Search size={18} color={colors.neutral[400]} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="חיפוש חברי צוות..."
              placeholderTextColor={colors.neutral[400]}
              style={[styles.searchInput, { color: colors.neutral[900] }]}
            />
          </View>
        </AnimatedView>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={[styles.loadingText, { color: colors.neutral[500] }]}>
              טוען חברי צוות...
            </Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <AnimatedView
            entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
            style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.neutral[100] }]}>
              <Users size={32} color={colors.neutral[400]} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
              {searchQuery ? 'לא נמצאו תוצאות' : 'אין חברי צוות'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
              {searchQuery
                ? 'נסה לחפש עם מילות מפתח שונות'
                : 'חברי צוות יופיעו כאן כשהם ישויכו לפרויקטים שלך'}
            </Text>
          </AnimatedView>
        ) : (
          Object.entries(groupedMembers).map(([role, members], groupIdx) => (
            <AnimatedView
              key={role}
              entering={FadeInUp.duration(500).delay(200 + groupIdx * 100).easing(Easing.out(Easing.ease))}
              style={styles.roleSection}
            >
              <View style={styles.roleSectionHeader}>
                <Text style={[styles.roleSectionTitle, { color: colors.neutral[700] }]}>
                  {USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS] ?? role}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.primary[50] }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.primary[600] }]}>
                    {members.length}
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                {members.map((member, idx) => (
                  <React.Fragment key={member.id}>
                    {idx > 0 && (
                      <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                    )}
                    <View style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary[100] }]}>
                        {member.profileImage ? (
                          <Image
                            source={{ uri: member.profileImage }}
                            style={styles.memberAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={[styles.memberInitials, { color: colors.primary[600] }]}>
                            {getInitials(member.fullName ?? member.email)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.neutral[900] }]}>
                          {member.fullName ?? (`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email)}
                        </Text>
                        <View style={styles.memberMeta}>
                          <Mail size={12} color={colors.neutral[400]} />
                          <Text style={[styles.memberMetaText, { color: colors.neutral[500] }]}>
                            {member.email}
                          </Text>
                        </View>
                        {member.phone && (
                          <View style={styles.memberMeta}>
                            <Briefcase size={12} color={colors.neutral[400]} />
                            <Text style={[styles.memberMetaText, { color: colors.neutral[500] }]}>
                              {member.phone}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </AnimatedView>
          ))
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

  // Stats bar
  statsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Search
  searchSection: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Empty state
  emptyState: {
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
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Role section
  roleSection: {
    marginBottom: 20,
  },
  roleSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  roleSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  // Member row
  memberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  memberMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  memberMetaText: {
    fontSize: 13,
  },

  divider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: -16,
    marginLeft: 76,
  },
});
