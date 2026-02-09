import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { formatDate } from '@/lib/utils';
import type { Question, AnswerValue } from '@/lib/types';

interface DateFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  error?: string;
}

function CalendarIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={colors.neutral[500]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Date picker field for date question types
 * iOS: presents in a modal to avoid pushing form content
 * Android: uses native date picker dialog
 */
export function DateField({ question, value, onChange, error }: DateFieldProps) {
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const dateValue = typeof value === 'string' && value ? new Date(value) : null;

  const handleOpen = () => {
    setTempDate(dateValue ?? new Date());
    setShowPicker(true);
  };

  const handleChangeAndroid = (_event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleChangeIOS = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmIOS = () => {
    onChange(tempDate.toISOString().split('T')[0]);
    setShowPicker(false);
  };

  const displayValue = dateValue ? formatDate(dateValue.toISOString()) : '';

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
        onPress={handleOpen}
        style={({ pressed }) => ({
          backgroundColor: colors.neutral[100],
          borderRadius: 12,
          padding: 12,
          height: 48,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger[500] : colors.neutral[200],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 16,
            color: displayValue ? colors.neutral[900] : colors.neutral[400],
            textAlign: 'right',
            flex: 1,
          }}
        >
          {displayValue || 'בחר תאריך...'}
        </Text>
        <CalendarIcon />
      </Pressable>

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}

      {/* Android: native dialog */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChangeAndroid}
          locale="he-IL"
        />
      )}

      {/* iOS: modal with spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
            {/* Header */}
            <View
              style={{
                paddingTop: insets.top + 8,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(0, 0, 0, 0.08)',
                paddingHorizontal: 16,
                paddingBottom: 16,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: '#D4D4D4',
                  alignSelf: 'center',
                  marginBottom: 12,
                }}
              />
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.neutral[500],
                    }}
                  >
                    ביטול
                  </Text>
                </Pressable>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: colors.neutral[900],
                  }}
                >
                  בחר תאריך
                </Text>
                <Pressable onPress={handleConfirmIOS} hitSlop={8}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.primary[600],
                    }}
                  >
                    אישור
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Picker */}
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChangeIOS}
                locale="he-IL"
                style={{ width: '100%' }}
              />
            </View>

            {/* Confirm button at bottom */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                paddingTop: 16,
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: 'rgba(0, 0, 0, 0.08)',
              }}
            >
              <Pressable
                onPress={handleConfirmIOS}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary[600],
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 17,
                    fontWeight: '600',
                  }}
                >
                  אישור
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
