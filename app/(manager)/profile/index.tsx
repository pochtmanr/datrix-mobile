import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Paths, Directory } from 'expo-file-system';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  Mail,
  Phone,
  Hash,
  Briefcase,
  RefreshCw,
  WifiOff,
  Wifi,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Pencil,
  Camera,
  Users,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  Shield,
  ExternalLink,
  ImageIcon,
  HardDrive,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { supabase } from '@/api/supabase';
import { useSyncStore, useDraftStore } from '@/store';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { colors } from '@/theme/colors';
import { formatPhoneNumber, getInitials, formatFileSize } from '@/lib/utils';
import { checkFullConnectivity } from '@/lib/network';
import { forceSync } from '@/sync';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Profile Screen
 * User profile, quick actions to sub-screens, sync status, and logout.
 * All data is scoped to the authenticated manager's assigned projects.
 */
export default function ManagerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();
  const { isOnline, pendingCount, lastSyncAt, syncErrors } = useSyncStore();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [storageUsed, setStorageUsed] = useState<string>('');
  const [showSyncErrors, setShowSyncErrors] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);

  // Photo queue stats
  const photoQueue = useDraftStore((s) => s.photoQueue);
  const photosPending = photoQueue.filter((p) => p.status === 'pending').length;
  const photosUploading = photoQueue.filter((p) => p.status === 'uploading').length;
  const photosFailed = photoQueue.filter((p) => p.status === 'failed').length;
  const photosTotal = photosPending + photosUploading + photosFailed;

  useEffect(() => {
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      if (photosDir.exists) {
        const size = photosDir.size;
        if (size !== null) {
          setStorageUsed(formatFileSize(size));
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }, []);

  const handleChangePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לגלריה כדי לשנות תמונת פרופיל');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0] || !user?.id) return;

    setIsUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}.${ext}`;
      const filePath = `profile-images/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('app_users')
        .update({ profile_image: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      await refreshUser();
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את התמונה. נסה שוב.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user?.id, refreshUser]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error signing out:', error);
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleCheckConnection = useCallback(async () => {
    setIsCheckingConnection(true);
    try {
      const { hasNetwork, supabaseReachable } = await checkFullConnectivity();
      useSyncStore.getState().setOnline(supabaseReachable);

      if (!hasNetwork) {
        Alert.alert('בדיקת חיבור', 'אין חיבור לרשת');
      } else if (!supabaseReachable) {
        Alert.alert('בדיקת חיבור', 'יש חיבור לרשת אך השרת לא נגיש');
      } else {
        Alert.alert('בדיקת חיבור', 'החיבור תקין');
      }
    } catch {
      Alert.alert('בדיקת חיבור', 'שגיאה בבדיקת החיבור');
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  const handleForceSync = useCallback(async () => {
    setIsForceSyncing(true);
    try {
      await forceSync();
      Alert.alert('סנכרון', 'הסנכרון הושלם בהצלחה');
    } catch {
      Alert.alert('סנכרון', 'שגיאה בסנכרון. נסה שוב.');
    } finally {
      setIsForceSyncing(false);
    }
  }, []);

  const formatSyncTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const syncDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - syncDay.getTime()) / (1000 * 60 * 60 * 24));

    const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return time;
    if (diffDays === 1) return `אתמול, ${time}`;
    return `לפני ${diffDays} ימים`;
  };

  const getSyncStatus = () => {
    if (!isOnline) {
      return { icon: WifiOff, text: 'אין חיבור', color: colors.warning[500] };
    }
    if (syncErrors.length > 0) {
      return { icon: AlertTriangle, text: 'שגיאות סנכרון', color: colors.danger[500] };
    }
    if (pendingCount > 0) {
      return { icon: RefreshCw, text: `${pendingCount} פריטים ממתינים`, color: colors.warning[500] };
    }
    return { icon: CheckCircle, text: 'מסונכרן', color: colors.success[500] };
  };

  const syncStatus = getSyncStatus();
  const SyncIcon = syncStatus.icon;

  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const borderColor = 'rgba(0, 0, 0, 0.08)';

  const fullName = user?.fullName ?? (`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'מנהל');

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
      >
        {/* Header */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(100).easing(Easing.out(Easing.ease))}
          style={styles.headerSection}
        >
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            הפרופיל שלי
          </Text>
        </AnimatedView>

        {/* Profile Info Card */}
        <AnimatedView
          entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
              פרטי משתמש
            </Text>
            <Pressable
              onPress={() => router.push('/(manager)/profile/edit')}
              style={({ pressed }) => [
                styles.editIconButton,
                { backgroundColor: colors.primary[50], opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Pencil size={16} color={colors.primary[600]} />
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Avatar + Name Row */}
            <Pressable
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
              style={styles.profileRow}
            >
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary[100] }]}>
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.primary[600] }]}>
                    {getInitials(fullName)}
                  </Text>
                )}
                <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={14} color="#FFFFFF" />
                  )}
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.neutral[900] }]}>
                  {fullName}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.neutral[500] }]}>
                  {user?.email}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: `${colors.primary[500]}15` }]}>
                  <Text style={[styles.roleText, { color: colors.primary[600] }]}>
                    {user?.role ? USER_ROLE_LABELS[user.role] : 'מנהל'}
                  </Text>
                </View>
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Email Row */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                <Mail size={18} color={colors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>אימייל</Text>
                <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                  {user?.email ?? '-'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Phone Row */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                <Phone size={18} color={colors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>טלפון</Text>
                <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                  {formatPhoneNumber(user?.phone ?? user?.phoneNumber) || '-'}
                </Text>
              </View>
            </View>

            {user?.employeeNumber && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                    <Hash size={18} color={colors.neutral[500]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>מספר עובד</Text>
                    <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                      {user.employeeNumber}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Role Row */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                <Briefcase size={18} color={colors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>תפקיד</Text>
                <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                  {user?.role ? USER_ROLE_LABELS[user.role] : '-'}
                </Text>
              </View>
            </View>
          </View>
        </AnimatedView>

        {/* Quick Actions — navigate to sub-screens */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(400).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            גישה מהירה
          </Text>

          <View style={styles.quickActionsGrid}>
            {/* Team Management */}
            <Pressable
              onPress={() => router.push('/(manager)/profile/team')}
              style={({ pressed }) => [
                styles.quickActionCard,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary[50] }]}>
                <Users size={24} color={colors.primary[600]} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.neutral[900] }]}>
                ניהול צוות
              </Text>
            </Pressable>

            {/* Reports */}
            <Pressable
              onPress={() => router.push('/(manager)/profile/reports')}
              style={({ pressed }) => [
                styles.quickActionCard,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.success[50] }]}>
                <BarChart3 size={24} color={colors.success[600]} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.neutral[900] }]}>
                דוחות
              </Text>
            </Pressable>

            {/* Notifications */}
            <Pressable
              onPress={() => Alert.alert('בקרוב', 'הגדרות התראות יהיו זמינות בגרסה הבאה')}
              style={({ pressed }) => [
                styles.quickActionCard,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.warning[50] }]}>
                <Bell size={24} color={colors.warning[600]} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.neutral[900] }]}>
                התראות
              </Text>
            </Pressable>

            {/* Settings */}
            <Pressable
              onPress={() => router.push('/(manager)/profile/settings')}
              style={({ pressed }) => [
                styles.quickActionCard,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.neutral[100] }]}>
                <Settings size={24} color={colors.neutral[600]} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.neutral[900] }]}>
                הגדרות
              </Text>
            </Pressable>
          </View>
        </AnimatedView>

        {/* Sync Status Card */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(450).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900], marginBottom: 10 }]}>
            סטטוס סנכרון
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Current status */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${syncStatus.color}15` }]}>
                <SyncIcon size={18} color={syncStatus.color} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>מצב נוכחי</Text>
                <Text style={[styles.infoValue, { color: syncStatus.color }]}>
                  {syncStatus.text}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: syncStatus.color }]} />
            </View>

            {/* Last sync time */}
            {lastSyncAt && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                    <RefreshCw size={18} color={colors.neutral[500]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                      סנכרון אחרון
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                      {formatSyncTime(lastSyncAt)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Photo upload queue */}
            {photosTotal > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.warning[50] }]}>
                    <ImageIcon size={18} color={colors.warning[600]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                      תמונות בתור העלאה
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                      {photosPending > 0 && `${photosPending} ממתינות`}
                      {photosUploading > 0 && `${photosPending > 0 ? ' · ' : ''}${photosUploading} בהעלאה`}
                      {photosFailed > 0 && (
                        <Text style={{ color: colors.danger[500] }}>
                          {(photosPending > 0 || photosUploading > 0) ? ' · ' : ''}{photosFailed} נכשלו
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Local storage usage */}
            {storageUsed ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                    <HardDrive size={18} color={colors.neutral[500]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                      אחסון מקומי
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                      {storageUsed}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {/* Sync errors expandable */}
            {syncErrors.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <Pressable
                  onPress={() => setShowSyncErrors(!showSyncErrors)}
                  style={styles.infoRow}
                >
                  <View style={[styles.infoIcon, { backgroundColor: colors.danger[50] }]}>
                    <AlertTriangle size={18} color={colors.danger[500]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                      שגיאות ({syncErrors.length})
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.danger[600] }]}>
                      {showSyncErrors ? 'הסתר פרטים ▲' : 'הצג פרטים ▼'}
                    </Text>
                  </View>
                </Pressable>
                {showSyncErrors && syncErrors.map((err, i) => (
                  <View
                    key={`${err.table}-${err.recordId}-${i}`}
                    style={{
                      backgroundColor: colors.danger[50],
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.danger[700], textAlign: 'right' }}>
                      {err.table} · {err.error}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.danger[400], textAlign: 'right', marginTop: 2 }}>
                      {err.timestamp ? new Date(err.timestamp).toLocaleString('he-IL') : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Action buttons */}
            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
            <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={handleForceSync}
                disabled={isForceSyncing || !isOnline}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: colors.primary[50],
                  opacity: pressed || isForceSyncing || !isOnline ? 0.7 : 1,
                })}
              >
                {isForceSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <RefreshCw size={16} color={colors.primary[600]} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary[700] }}>
                  סנכרן עכשיו
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCheckConnection}
                disabled={isCheckingConnection}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: colors.neutral[100],
                  opacity: pressed || isCheckingConnection ? 0.7 : 1,
                })}
              >
                {isCheckingConnection ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <Wifi size={16} color={colors.primary[600]} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary[700] }}>
                  בדוק חיבור
                </Text>
              </Pressable>
            </View>
          </View>
        </AnimatedView>

        {/* Support & Legal */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(500).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900], marginBottom: 10 }]}>
            תמיכה ומידע
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
              onPress={() => Linking.openURL('https://datrix.co.il/support')}
              style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.infoIcon, { backgroundColor: colors.primary[50] }]}>
                <HelpCircle size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                  תמיכה טכנית
                </Text>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                  צור קשר עם צוות התמיכה
                </Text>
              </View>
              <ExternalLink size={16} color={colors.neutral[400]} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            <Pressable
              onPress={() => Linking.openURL('https://datrix.co.il/privacy')}
              style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                <Shield size={18} color={colors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                  מדיניות פרטיות
                </Text>
                <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>
                  קרא את מדיניות הפרטיות שלנו
                </Text>
              </View>
              <ExternalLink size={16} color={colors.neutral[400]} />
            </Pressable>
          </View>
        </AnimatedView>

        {/* Logout */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(550).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: colors.danger[500],
                opacity: pressed || isSigningOut ? 0.8 : 1,
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <LogOut size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>התנתקות</Text>
              </>
            )}
          </Pressable>
        </AnimatedView>

        {/* Version */}
        <AnimatedView
          entering={FadeInUp.duration(400).delay(600).easing(Easing.out(Easing.ease))}
          style={styles.versionSection}
        >
          <Text style={[styles.versionText, { color: colors.neutral[400] }]}>
            Datrix Mobile
          </Text>
          <Text style={[styles.versionNumber, { color: colors.neutral[300] }]}>
            גרסה 1.0.0
          </Text>
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

  // Profile Row
  profileRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 14,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: -16,
    marginLeft: 52,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  linkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    paddingVertical: 16,
    gap: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Version
  versionSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  versionText: {
    fontSize: 14,
  },
  versionNumber: {
    fontSize: 12,
    marginTop: 2,
  },
});
