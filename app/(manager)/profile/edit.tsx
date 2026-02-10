import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Save,
  Camera,
} from 'lucide-react-native';

import { useAuth } from '@/auth';
import { supabase } from '@/api/supabase';
import { camelToSnake } from '@/lib/caseUtils';
import { colors } from '@/theme/colors';
import { getInitials } from '@/lib/utils';

/**
 * Manager Edit Profile Screen
 * Allows editing first name, last name, phone, and profile image.
 * Email is read-only. Consistent with surveyor edit profile flow.
 */
export default function ManagerEditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? user?.phoneNumber ?? '');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    firstName !== (user?.firstName ?? '') ||
    lastName !== (user?.lastName ?? '') ||
    phone !== (user?.phone ?? user?.phoneNumber ?? '') ||
    profileImageUri !== null;

  const handlePickImage = useCallback(async () => {
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

    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
      let profileImage = user.profileImage;

      // Upload new profile image if selected
      if (profileImageUri) {
        const ext = profileImageUri.split('.').pop() ?? 'jpg';
        const fileName = `${user.id}.${ext}`;
        const filePath = `profile-images/${fileName}`;

        const response = await fetch(profileImageUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, {
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (uploadError) {
          console.warn('Image upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          profileImage = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from('app_users')
        .update(
          camelToSnake({
            firstName: firstName || null,
            lastName: lastName || null,
            fullName,
            phone: phone || null,
            profileImage: profileImage || null,
            updatedAt: new Date().toISOString(),
          })
        )
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את הפרופיל. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, firstName, lastName, phone, profileImageUri, refreshUser]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert('שינויים לא שמורים', 'האם לבטל את השינויים?', [
        { text: 'המשך עריכה', style: 'cancel' },
        { text: 'בטל', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [hasChanges]);

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
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.neutral[100] }]}
        >
          <ArrowRight size={20} color={colors.primary[600]} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.neutral[900] }]}>
            עריכת פרופיל
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 150,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <Pressable onPress={handlePickImage} style={styles.avatarSection}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary[100] }]}>
              {profileImageUri || user?.profileImage ? (
                <Image
                  source={{ uri: profileImageUri ?? user?.profileImage ?? '' }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary[600] }]}>
                  {getInitials(user?.fullName ?? user?.email)}
                </Text>
              )}
              <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <Camera size={20} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.changePhotoText, { color: colors.primary[600] }]}>
              שנה תמונה
            </Text>
          </Pressable>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* First Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                שם פרטי
              </Text>
              <View style={[styles.inputRow, { borderColor }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <User size={18} color={colors.neutral[500]} />
                </View>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="הזן שם פרטי"
                  placeholderTextColor={colors.neutral[400]}
                  style={[styles.input, { color: colors.neutral[900] }]}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Last Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                שם משפחה
              </Text>
              <View style={[styles.inputRow, { borderColor }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <User size={18} color={colors.neutral[500]} />
                </View>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="הזן שם משפחה"
                  placeholderTextColor={colors.neutral[400]}
                  style={[styles.input, { color: colors.neutral[900] }]}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Email (read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                אימייל
              </Text>
              <View style={[styles.inputRow, { borderColor, opacity: 0.6 }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <Mail size={18} color={colors.neutral[400]} />
                </View>
                <TextInput
                  value={user?.email ?? ''}
                  editable={false}
                  style={[styles.input, { color: colors.neutral[500] }]}
                />
              </View>
              <Text style={[styles.fieldHint, { color: colors.neutral[400] }]}>
                לא ניתן לשנות את כתובת האימייל
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.neutral[100] }]} />

            {/* Phone */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.neutral[500] }]}>
                טלפון
              </Text>
              <View style={[styles.inputRow, { borderColor }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.neutral[100] }]}>
                  <Phone size={18} color={colors.neutral[500]} />
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="050-0000000"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="phone-pad"
                  style={[styles.input, { color: colors.neutral[900] }]}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 65,
              backgroundColor: '#FFFFFF',
              borderColor,
            },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: hasChanges
                  ? colors.primary[600]
                  : colors.neutral[300],
                opacity: pressed && hasChanges ? 0.85 : 1,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>שמור שינויים</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },

  // Fields
  fieldContainer: {
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    textAlign: 'right',
  },
  fieldHint: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: -16,
  },

  // Bottom Bar
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
