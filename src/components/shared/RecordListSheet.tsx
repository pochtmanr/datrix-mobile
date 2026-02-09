import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import Animated, { FadeInUp, Easing } from 'react-native-reanimated';
import {
  FileText,
  FolderOpen,
  Clock,
  PlayCircle,
  CheckCircle,
  ChevronLeft,
  X,
  PartyPopper,
  ClipboardList,
} from 'lucide-react-native';

import { RECORD_STATUS_LABELS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { colors } from '@/theme/colors';
import type { Record as RecordType, Project } from '@/lib/types';

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

export type RecordListTab = 'completed' | 'waiting';

interface RecordListSheetProps {
  visible: boolean;
  onClose: () => void;
  initialTab: RecordListTab;
  records: RecordType[] | undefined;
  projects: Project[] | undefined;
}

/**
 * RecordListSheet
 * A bottom-sheet-style modal that shows records in two tabs:
 * "Completed Today" and "Waiting"
 */
export function RecordListSheet({
  visible,
  onClose,
  initialTab,
  records,
  projects,
}: RecordListSheetProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<RecordListTab>(initialTab);

  // Reset tab when sheet opens with a new initialTab
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Filter records by tab
  const filteredRecords = useMemo(() => {
    if (!records) return [];

    if (activeTab === 'completed') {
      const today = new Date().toDateString();
      return records.filter(
        (r) =>
          r.status === 'form_filled' &&
          new Date(r.updatedAt).toDateString() === today
      );
    }

    // waiting
    return records.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    );
  }, [records, activeTab]);

  // Group by project
  const groupedByProject = useMemo(() => {
    const grouped = new Map<string, RecordType[]>();

    filteredRecords.forEach((record) => {
      if (!grouped.has(record.projectId)) {
        grouped.set(record.projectId, []);
      }
      grouped.get(record.projectId)!.push(record);
    });

    return grouped;
  }, [filteredRecords]);

  const getProjectName = (projectId: string) =>
    projects?.find((p) => p.id === projectId)?.name ?? 'פרויקט';

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.neutral[50] }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderColor }]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.neutral[100], opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <X size={20} color={colors.neutral[600]} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
              סקרים
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Segmented Control */}
          <View style={[styles.segmentedControl, { backgroundColor: colors.neutral[100] }]}>
            <Pressable
              onPress={() => setActiveTab('waiting')}
              style={[
                styles.segment,
                activeTab === 'waiting' && {
                  backgroundColor: colors.primary[600],
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === 'waiting' ? '#FFFFFF' : colors.neutral[600],
                    fontWeight: activeTab === 'waiting' ? '600' : '500',
                  },
                ]}
              >
                ממתינים
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('completed')}
              style={[
                styles.segment,
                activeTab === 'completed' && {
                  backgroundColor: colors.primary[600],
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === 'completed' ? '#FFFFFF' : colors.neutral[600],
                    fontWeight: activeTab === 'completed' ? '600' : '500',
                  },
                ]}
              >
                הושלמו היום
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filteredRecords.length === 0 ? (
            <AnimatedView
              entering={FadeInUp.duration(400).easing(Easing.out(Easing.ease))}
              style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      activeTab === 'completed'
                        ? colors.neutral[100]
                        : colors.success[50],
                  },
                ]}
              >
                {activeTab === 'completed' ? (
                  <ClipboardList size={36} color={colors.neutral[400]} />
                ) : (
                  <PartyPopper size={36} color={colors.success[500]} />
                )}
              </View>
              <Text style={[styles.emptyTitle, { color: colors.neutral[900] }]}>
                {activeTab === 'completed'
                  ? 'אין סקרים שהושלמו היום'
                  : 'אין משימות ממתינות!'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.neutral[500] }]}>
                {activeTab === 'completed'
                  ? 'סקרים שימולאו היום יופיעו כאן'
                  : 'כל הרשומות הושלמו. עבודה מצוינת!'}
              </Text>
            </AnimatedView>
          ) : (
            <View style={styles.projectGroups}>
              {Array.from(groupedByProject.entries()).map(
                ([projectId, projectRecords], groupIndex) => (
                  <AnimatedView
                    key={projectId}
                    entering={FadeInUp.duration(400)
                      .delay(groupIndex * 80)
                      .easing(Easing.out(Easing.ease))}
                    style={styles.projectGroup}
                  >
                    {/* Project Header */}
                    <View style={styles.projectHeader}>
                      <View
                        style={[
                          styles.projectIconSmall,
                          { backgroundColor: colors.primary[50] },
                        ]}
                      >
                        <FolderOpen size={16} color={colors.primary[600]} />
                      </View>
                      <Text style={[styles.projectName, { color: colors.neutral[900] }]}>
                        {getProjectName(projectId)}
                      </Text>
                      <View style={[styles.countBadge, { backgroundColor: colors.primary[50] }]}>
                        <Text style={[styles.countText, { color: colors.primary[600] }]}>
                          {projectRecords.length}
                        </Text>
                      </View>
                    </View>

                    {/* Records */}
                    <View style={styles.recordsList}>
                      {projectRecords.map((record) => {
                        const statusStyle =
                          statusColors[record.status] || statusColors.not_started;
                        const StatusIcon =
                          record.status === 'in_progress'
                            ? PlayCircle
                            : record.status === 'form_filled'
                              ? CheckCircle
                              : Clock;

                        return (
                          <Link
                            key={record.id}
                            href={
                              `/(surveyor)/projects/${projectId}/records/${record.id}/fill` as const
                            }
                            asChild
                          >
                            <Pressable
                              onPress={onClose}
                              style={({ pressed }) => [
                                styles.recordCard,
                                {
                                  backgroundColor: cardBg,
                                  borderColor,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.recordIcon,
                                  { backgroundColor: statusStyle.bg },
                                ]}
                              >
                                <FileText size={18} color={statusStyle.text} />
                              </View>
                              <View style={styles.recordInfo}>
                                <View style={styles.recordHeader}>
                                  <Text
                                    style={[styles.recordId, { color: colors.neutral[900] }]}
                                  >
                                    #{record.externalId ?? record.id.slice(-8)}
                                  </Text>
                                  <View
                                    style={[
                                      styles.statusBadge,
                                      { backgroundColor: statusStyle.bg },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.statusText, { color: statusStyle.text }]}
                                    >
                                      {RECORD_STATUS_LABELS[record.status]}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={[styles.recordTime, { color: colors.neutral[500] }]}
                                >
                                  {activeTab === 'completed'
                                    ? formatRelativeTime(record.updatedAt)
                                    : formatRelativeTime(record.createdDate)}
                                  {record.area ? ` · ${record.area}` : ''}
                                </Text>
                              </View>
                              <ChevronLeft size={20} color={colors.primary[500]} />
                            </Pressable>
                          </Link>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D4D4D4',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row-reverse',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
  },

  // Content
  scrollView: {
    flex: 1,
  },

  // Empty State
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 48,
    alignItems: 'center',
    marginTop: 40,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
