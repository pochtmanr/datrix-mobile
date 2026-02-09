import React, { useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Paths, File as FSFile, Directory } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { generateOfflineId } from '@/lib/utils';
import { useDraftStore } from '@/store/draftStore';
import { PHOTO_CONFIG } from '@/lib/constants';
import type { Question, AnswerValue, PhotoUploadItem } from '@/lib/types';

interface PhotoFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  recordId: string;
  pageId?: string | null;
  error?: string;
}

function CameraIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GalleryIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke={colors.danger[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Photo capture field with camera and gallery options
 */
export function PhotoField({
  question,
  value,
  onChange,
  recordId,
  pageId,
  error,
}: PhotoFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const addPhotoToQueue = useDraftStore((s) => s.addPhotoToQueue);

  const photoUri = typeof value === 'string' ? value : null;

  const requestPermissions = async (source: 'camera' | 'gallery'): Promise<boolean> => {
    const result =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (result.status !== 'granted') {
      Alert.alert(
        'הרשאה נדרשת',
        source === 'camera'
          ? 'נדרשת הרשאת מצלמה לצילום תמונות. ניתן לאשר בהגדרות.'
          : 'נדרשת הרשאת גלריה לבחירת תמונות. ניתן לאשר בהגדרות.',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'הגדרות', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  /**
   * Copies a photo from tmp to documentDirectory so it persists across app restarts,
   * then compresses if needed to stay under PHOTO_CONFIG.MAX_SIZE_BYTES.
   */
  const persistAndCompressPhoto = async (tmpUri: string): Promise<string> => {
    const photosDir = new Directory(Paths.document, 'photos');
    if (!photosDir.exists) {
      photosDir.create({ intermediates: true });
    }

    const ext = tmpUri.split('.').pop() ?? 'jpg';
    const fileName = `${generateOfflineId()}.${ext}`;
    const destFile = new FSFile(photosDir, fileName);

    // Copy from tmp to persistent storage
    const srcFile = new FSFile(tmpUri);
    srcFile.copy(destFile);

    // Check file size and compress if over limit
    if (destFile.exists && destFile.size > PHOTO_CONFIG.MAX_SIZE_BYTES) {
      const compressed = await ImageManipulator.manipulateAsync(
        destFile.uri,
        [{ resize: { width: PHOTO_CONFIG.MAX_DIMENSION } }],
        { compress: PHOTO_CONFIG.COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );
      // Replace with compressed version
      destFile.delete();
      const compressedFile = new FSFile(compressed.uri);
      compressedFile.move(destFile);
    }

    return destFile.uri;
  };

  const handleCapture = async (source: 'camera' | 'gallery') => {
    const hasPermission = await requestPermissions(source);
    if (!hasPermission) return;

    setIsLoading(true);

    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsEditing: false,
            });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Copy to documentDirectory for persistence across app restarts
        const persistedUri = await persistAndCompressPhoto(asset.uri);

        // Add to photo queue for upload
        const photoItem: PhotoUploadItem = {
          id: generateOfflineId(),
          localUri: persistedUri,
          recordId,
          questionId: question.id,
          pageId: pageId ?? null,
          status: 'pending',
          retryCount: 0,
          remoteUrl: null,
          error: null,
        };
        addPhotoToQueue(photoItem);

        // Set persisted URI as value (will be replaced with remote URL after upload)
        onChange(persistedUri);
      }
    } catch (err) {
      console.error('Photo capture error:', err);
      Alert.alert('שגיאה', 'שגיאה בצילום תמונה');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('מחיקת תמונה', 'האם אתה בטוח שברצונך למחוק את התמונה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => onChange(''),
      },
    ]);
  };

  const handleReplace = () => {
    Alert.alert('החלפת תמונה', 'בחר מקור לתמונה חדשה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מצלמה', onPress: () => handleCapture('camera') },
      { text: 'גלריה', onPress: () => handleCapture('gallery') },
    ]);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-foreground">
        {question.text}
        {question.isRequired && (
          <Text className="text-danger"> *</Text>
        )}
      </Text>
      {question.helpText && (
        <Text className="mb-2 text-sm text-muted-foreground">
          {question.helpText}
        </Text>
      )}

      {isLoading ? (
        <View
          style={{
            backgroundColor: colors.neutral[100],
            borderRadius: 12,
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={colors.primary[600]} size="large" />
          <Text className="mt-2 text-muted-foreground">טוען...</Text>
        </View>
      ) : photoUri ? (
        <View>
          <Image
            source={{ uri: photoUri }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 12,
              backgroundColor: colors.neutral[200],
            }}
            resizeMode="cover"
          />
          {/* Action buttons on the photo */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Pressable
              onPress={handleRemove}
              style={({ pressed }) => ({
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <TrashIcon />
            </Pressable>
            <Pressable
              onPress={handleReplace}
              style={({ pressed }) => ({
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CameraIcon size={20} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handleCapture('camera')}
            style={{
              flex: 1,
              backgroundColor: colors.neutral[100],
              borderRadius: 12,
              padding: 20,
              alignItems: 'center',
              borderWidth: error ? 2 : 1,
              borderColor: error ? colors.danger[500] : colors.neutral[200],
            }}
          >
            <CameraIcon size={32} />
            <Text className="mt-2 text-sm font-medium text-foreground">
              צלם תמונה
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleCapture('gallery')}
            style={{
              flex: 1,
              backgroundColor: colors.neutral[100],
              borderRadius: 12,
              padding: 20,
              alignItems: 'center',
              borderWidth: error ? 2 : 1,
              borderColor: error ? colors.danger[500] : colors.neutral[200],
            }}
          >
            <GalleryIcon size={32} />
            <Text className="mt-2 text-sm font-medium text-foreground">
              בחר מגלריה
            </Text>
          </Pressable>
        </View>
      )}

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}
    </View>
  );
}
