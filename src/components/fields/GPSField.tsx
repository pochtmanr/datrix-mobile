import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface GPSFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: { latitude: number; longitude: number; accuracy?: number }) => void;
  error?: string;
}

function LocationIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13a3 3 0 100-6 3 3 0 000 6z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={colors.success[600]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * GPS location capture field
 */
export function GPSField({ question, value, onChange, error }: GPSFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const hasLocation =
    typeof value === 'object' &&
    value !== null &&
    'latitude' in value &&
    'longitude' in value;

  const locationValue = hasLocation
    ? (value as { latitude: number; longitude: number; accuracy?: number })
    : null;

  const handleCapture = async () => {
    setIsLoading(true);
    setLocationError(null);

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('הרשאת מיקום נדחתה');
        setIsLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      onChange({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
      });
    } catch (err) {
      console.error('Location error:', err);
      setLocationError('שגיאה בקבלת מיקום');
    } finally {
      setIsLoading(false);
    }
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

      <Pressable
        onPress={handleCapture}
        disabled={isLoading}
        style={{
          backgroundColor: hasLocation ? colors.success[50] : colors.neutral[100],
          borderRadius: 12,
          padding: 16,
          borderWidth: error || locationError ? 2 : 1,
          borderColor:
            error || locationError
              ? colors.danger[500]
              : hasLocation
                ? colors.success[500]
                : colors.neutral[200],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color={colors.primary[600]} size="small" />
              <Text className="text-base text-muted-foreground">מקבל מיקום...</Text>
            </View>
          ) : hasLocation ? (
            <View>
              <View className="flex-row items-center gap-2">
                <CheckIcon />
                <Text className="text-base font-medium text-success-700">
                  מיקום נקלט
                </Text>
              </View>
              <Text className="mt-1 text-sm text-muted-foreground">
                {locationValue?.latitude.toFixed(6)}, {locationValue?.longitude.toFixed(6)}
                {locationValue?.accuracy && ` (±${Math.round(locationValue.accuracy)}מ')`}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <LocationIcon />
              <Text className="text-base text-muted-foreground">
                לחץ לקליטת מיקום
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {(error || locationError) && (
        <Text className="mt-1 text-sm text-danger">{error || locationError}</Text>
      )}
    </View>
  );
}
