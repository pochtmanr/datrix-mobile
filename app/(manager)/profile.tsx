import React, { useState, useCallback } from 'react';
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
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import {
  Mail,
  Phone,
  Hash,
  Briefcase,
  LogOut,
  Pencil,
  ChevronLeft,
  Users,
  BarChart3,
  Bell,
  Settings,
  Camera,
  HelpCircle,
  Shield,
  ExternalLink,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { supabase } from '@/api/supabase';
import { ROLE_LABELS } from '@/lib/constants';
import { colors } from '@/theme/colors';
import { getInitials } from '@/lib/utils';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Manager Profile Screen
 * User profile, settings, and logout
 */
export default function ManagerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  // Card styling
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
              onPress={() => Alert.alert('בקרוב', 'עריכת פרופיל תהיה זמינה בגרסה הבאה')}
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
                    {user?.role ? ROLE_LABELS[user.role] : 'מנהל'}
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

            {user?.phone && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.neutral[100] }]}>
                    <Phone size={18} color={colors.neutral[500]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.neutral[500] }]}>טלפון</Text>
                    <Text style={[styles.infoValue, { color: colors.neutral[900] }]}>
                      {user.phone}
                    </Text>
                  </View>
                </View>
              </>
            )}

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
                  {user?.role ? ROLE_LABELS[user.role] : '-'}
                </Text>
              </View>
            </View>
          </View>
        </AnimatedView>

        {/* Quick Actions */}
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
              onPress={() => Alert.alert('בקרוב', 'ניהול צוות יהיה זמין בגרסה הבאה')}
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
              onPress={() => Alert.alert('בקרוב', 'דוחות יהיו זמינים בגרסה הבאה')}
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
              onPress={() => Alert.alert('בקרוב', 'הגדרות יהיו זמינות בגרסה הבאה')}
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

        {/* Support & Legal */}
        <AnimatedView
          entering={FadeInUp.duration(500).delay(450).easing(Easing.out(Easing.ease))}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.neutral[900] }]}>
            תמיכה ומידע
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Support */}
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

            {/* Privacy Policy */}
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
          entering={FadeInUp.duration(500).delay(500).easing(Easing.out(Easing.ease))}
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

  // Profile Row (inside card)
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
  linkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
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

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
