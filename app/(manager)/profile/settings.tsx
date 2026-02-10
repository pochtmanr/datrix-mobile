import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  ArrowRight,
  Bell,
  Wifi,
  Smartphone,
  Globe,
  Database,
  Trash2,
  Info,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { useSyncStore } from '@/store';
import { colors } from '@/theme/colors';
import { forceSync } from '@/sync';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Settings Screen
 * Account and app preferences scoped to the authenticated manager.
 * No cross-user or system-wide settings.
 */
export default function ManagerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline, pendingCount, lastSyncAt } = useSyncStore();

  // Local preference states (persisted via AsyncStorage in production)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [syncOnCellular, setSyncOnCellular] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      Alert.alert('סנכרון', 'הסנכרון הושלם בהצלחה');
    } catch {
      Alert.alert('סנכרון', 'שגיאה בסנכרון. נסה שוב.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'ניקוי מטמון',
      'פעולה זו תמחק נתונים מקומיים שמורים. הנתונים יסונכרנו מחדש מהשרת.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'נקה',
          style: 'destructive',
          onPress: () => {
            Alert.alert('בקרוב', 'ניקוי מטמון יהיה זמין בגרסה הבאה.');
          },
        },
      ]
    );
  }, []);

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
            הגדרות
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
      >
        {/* Notifications */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            התראות
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary[50] }]}>
                  <Bell size={18} color={colors.primary[600]} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                    התראות Push
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                    קבל התראות על עדכונים בפרויקטים
                  </Text>
                </View>
              </View>
              <Switch
                value={pushNotificationsEnabled}
                onValueChange={setPushNotificationsEnabled}
                trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </AnimatedView>

        {/* Sync & Data */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            סנכרון ונתונים
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Sync on cellular */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: colors.neutral[100] }]}>
                  <Wifi size={18} color={colors.neutral[600]} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                    סנכרון בנתונים סלולריים
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                    אפשר סנכרון גם בחיבור סלולרי
                  </Text>
                </View>
              </View>
              <Switch
                value={syncOnCellular}
                onValueChange={setSyncOnCellular}
                trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Sync status info */}
            <View style={styles.infoRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.neutral[100] }]}>
                <Database size={18} color={colors.neutral[600]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                  מצב סנכרון
                </Text>
                <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                  {isOnline ? 'מחובר' : 'לא מחובר'}
                  {pendingCount > 0 ? ` · ${pendingCount} ממתינים` : ''}
                  {lastSyncAt ? ` · עודכן ${new Date(lastSyncAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Force sync */}
            <Pressable
              onPress={handleForceSync}
              disabled={isSyncing || !isOnline}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed || isSyncing || !isOnline ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.primary[50] }]}>
                <RefreshCw size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.primary[600] }]}>
                  סנכרן עכשיו
                </Text>
                <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                  סנכרון ידני של כל הנתונים
                </Text>
              </View>
              <ChevronLeft size={18} color={colors.neutral[400]} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Clear cache */}
            <Pressable
              onPress={handleClearCache}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.danger[50] }]}>
                <Trash2 size={18} color={colors.danger[500]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.danger[600] }]}>
                  ניקוי מטמון מקומי
                </Text>
                <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                  מחיקת נתונים מקומיים וסנכרון מחדש
                </Text>
              </View>
              <ChevronLeft size={18} color={colors.neutral[400]} />
            </Pressable>
          </View>
        </AnimatedView>

        {/* App Info */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(300).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            אודות האפליקציה
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Version */}
            <View style={styles.infoRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.neutral[100] }]}>
                <Smartphone size={18} color={colors.neutral[600]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                  גרסה
                </Text>
                <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                  1.0.0
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Language */}
            <View style={styles.infoRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.neutral[100] }]}>
                <Globe size={18} color={colors.neutral[600]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                  שפה
                </Text>
                <Text style={[styles.settingDescription, { color: colors.neutral[500] }]}>
                  עברית
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Terms */}
            <Pressable
              onPress={() => Linking.openURL('https://datrix.co.il/terms')}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.neutral[100] }]}>
                <Info size={18} color={colors.neutral[600]} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.neutral[900] }]}>
                  תנאי שימוש
                </Text>
              </View>
              <ChevronLeft size={18} color={colors.neutral[400]} />
            </Pressable>
          </View>
        </AnimatedView>

        {/* Account info */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <View style={styles.accountInfo}>
            <Text style={[styles.accountText, { color: colors.neutral[400] }]}>
              מחובר כ: {user?.email}
            </Text>
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

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  // Setting row (with toggle)
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  settingContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    textAlign: 'right',
  },

  // Info row (read-only)
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
  },

  // Action row (pressable)
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
  },

  divider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: -16,
    marginLeft: 68,
  },

  // Account info
  accountInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  accountText: {
    fontSize: 13,
  },
});
