import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  Download,
  FileText,
  BarChart3,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  FolderOpen,
} from 'lucide-react-native';

import { useProjects } from '@/api/hooks/useProjects';
import { useRecords } from '@/api/hooks/useRecords';
import { colors } from '@/theme/colors';

const AnimatedView = Animated.createAnimatedComponent(View);

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  format: string;
  iconBg: string;
}

/**
 * Manager Reports Screen
 * Generate and download various reports
 */
export default function ManagerReportsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: allRecords, isLoading: recordsLoading, refetch: refetchRecords } = useRecords();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchRecords()]);
    setRefreshing(false);
  }, [refetchProjects, refetchRecords]);

  // Report types
  const REPORT_TYPES: ReportType[] = [
    {
      id: 'summary',
      name: 'דוח סיכום',
      description: 'סיכום כללי של כל הפרויקטים והרשומות',
      icon: <BarChart3 size={24} color={colors.success[600]} />,
      iconBg: colors.success[50],
      format: 'PDF',
    },
    {
      id: 'records',
      name: 'דוח רשומות',
      description: 'רשימת כל הרשומות עם פרטים מלאים',
      icon: <FileText size={24} color={colors.primary[600]} />,
      iconBg: colors.primary[50],
      format: 'Excel',
    },
    {
      id: 'progress',
      name: 'דוח התקדמות',
      description: 'מעקב התקדמות לפי פרויקט וסוקר',
      icon: <BarChart3 size={24} color={colors.warning[600]} />,
      iconBg: colors.warning[50],
      format: 'PDF',
    },
    {
      id: 'quality',
      name: 'דוח בקרת איכות',
      description: 'סטטיסטיקות בקרת איכות ותיקונים',
      icon: <FileSpreadsheet size={24} color={colors.primary[600]} />,
      iconBg: colors.primary[50],
      format: 'Excel',
    },
  ];

  // Calculate quick stats
  const stats = React.useMemo(() => {
    if (!allRecords) return { total: 0, completed: 0, pending: 0 };

    const total = allRecords.length;
    const completed = allRecords.filter(
      (r) => r.status === 'form_filled' || r.status === 'passed_quality_control'
    ).length;
    const pending = allRecords.filter(
      (r) => r.status === 'in_progress' || r.status === 'not_started'
    ).length;

    return { total, completed, pending };
  }, [allRecords]);

  const handleGenerateReport = async (reportType: ReportType) => {
    setGeneratingReport(reportType.id);

    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(null);
      Alert.alert(
        'דוח בהכנה',
        `הדוח "${reportType.name}" יישלח לאימייל שלך בקרוב.`,
        [{ text: 'אישור' }]
      );
    }, 2000);
  };

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
        {/* Header */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.headerSection}
        >
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            דוחות
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.neutral[500] }]}>
            הפקת דוחות וייצוא נתונים
          </Text>
        </AnimatedView>

        {/* Quick Stats */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={[styles.statsCard, { backgroundColor: cardBg, borderColor }]}
        >
          <Text style={[styles.cardTitle, { color: colors.neutral[900] }]}>
            סיכום מהיר
          </Text>
          {isLoading ? (
            <View style={styles.statsRow}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.statSkeleton, { backgroundColor: colors.neutral[200] }]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.primary[50] }]}>
                  <FolderOpen size={18} color={colors.primary[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.neutral[900] }]}>
                  {projects?.length ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.neutral[500] }]}>
                  פרויקטים
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.success[50] }]}>
                  <CheckCircle size={18} color={colors.success[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.success[600] }]}>
                  {stats.completed}
                </Text>
                <Text style={[styles.statLabel, { color: colors.neutral[500] }]}>
                  הושלמו
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.warning[50] }]}>
                  <Clock size={18} color={colors.warning[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.warning[600] }]}>
                  {stats.pending}
                </Text>
                <Text style={[styles.statLabel, { color: colors.neutral[500] }]}>
                  ממתינים
                </Text>
              </View>
            </View>
          )}
        </AnimatedView>

        {/* Report Types */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            סוגי דוחות
          </Text>

          <View style={styles.reportsList}>
            {REPORT_TYPES.map((report, index) => (
              <AnimatedView
                key={report.id}
                entering={FadeInUp.duration(400).delay(400 + index * 80).easing(Easing.out(Easing.ease))}
              >
                <View style={[styles.reportCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={[styles.reportIcon, { backgroundColor: report.iconBg }]}>
                    {report.icon}
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={[styles.reportName, { color: colors.neutral[900] }]}>
                      {report.name}
                    </Text>
                    <Text style={[styles.reportDescription, { color: colors.neutral[500] }]}>
                      {report.description}
                    </Text>
                    <Text style={[styles.reportFormat, { color: colors.neutral[400] }]}>
                      פורמט: {report.format}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleGenerateReport(report)}
                    disabled={generatingReport === report.id}
                    style={({ pressed }) => [
                      styles.generateButton,
                      {
                        backgroundColor: colors.primary[50],
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {generatingReport === report.id ? (
                      <ActivityIndicator size="small" color={colors.primary[600]} />
                    ) : (
                      <>
                        <Download size={16} color={colors.primary[600]} />
                        <Text style={[styles.generateButtonText, { color: colors.primary[600] }]}>
                          הפק
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </AnimatedView>
            ))}
          </View>
        </AnimatedView>

        {/* Export Options */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(600).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            ייצוא נתונים
          </Text>

          <View style={[styles.exportCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.exportTitle, { color: colors.neutral[900] }]}>
              ייצוא כללי
            </Text>
            <Text style={[styles.exportDescription, { color: colors.neutral[500] }]}>
              ייצא את כל הנתונים בפורמט CSV או Excel
            </Text>
            <View style={styles.exportButtons}>
              <Pressable
                onPress={() => Alert.alert('ייצוא', 'קובץ CSV יישלח לאימייל שלך.')}
                style={({ pressed }) => [
                  styles.exportButton,
                  styles.exportButtonOutline,
                  { borderColor: colors.primary[600], opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.exportButtonText, { color: colors.primary[600] }]}>
                  CSV
                </Text>
              </Pressable>
              <Pressable
                onPress={() => Alert.alert('ייצוא', 'קובץ Excel יישלח לאימייל שלך.')}
                style={({ pressed }) => [
                  styles.exportButton,
                  { backgroundColor: colors.primary[600], opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.exportButtonText, { color: '#FFFFFF' }]}>
                  Excel
                </Text>
              </Pressable>
            </View>
          </View>
        </AnimatedView>
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

  // Stats Card
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statSkeleton: {
    width: 60,
    height: 80,
    borderRadius: 12,
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

  // Reports List
  reportsList: {
    gap: 10,
  },
  reportCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  reportIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  reportInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  reportDescription: {
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 4,
  },
  reportFormat: {
    fontSize: 11,
    textAlign: 'right',
  },
  generateButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Export Card
  exportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  exportDescription: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 16,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
