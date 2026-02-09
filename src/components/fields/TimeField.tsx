import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface TimeFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  error?: string;
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Time picker field for time question types
 */
export function TimeField({ question, value, onChange, error }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Parse time string (HH:mm) to Date
  const parseTimeValue = (): Date => {
    if (typeof value === 'string' && value) {
      const [hours, minutes] = value.split(':').map(Number);
      const date = new Date();
      date.setHours(hours || 0, minutes || 0, 0, 0);
      return date;
    }
    return new Date();
  };

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  const displayValue = typeof value === 'string' && value ? value : '';

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
        onPress={() => setShowPicker(true)}
        style={{
          backgroundColor: colors.neutral[100],
          borderRadius: 12,
          padding: 12,
          height: 48,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger[500] : colors.neutral[200],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: displayValue ? colors.neutral[900] : colors.neutral[400],
            textAlign: 'right',
            flex: 1,
          }}
        >
          {displayValue || 'בחר שעה...'}
        </Text>
        <ClockIcon />
      </Pressable>

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}

      {showPicker && (
        <DateTimePicker
          value={parseTimeValue()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          is24Hour={true}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <View className="mt-2 flex-row justify-end gap-2">
          <Pressable
            onPress={() => setShowPicker(false)}
            className="rounded-lg bg-neutral-200 px-4 py-2"
          >
            <Text className="font-medium text-neutral-700">אישור</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
