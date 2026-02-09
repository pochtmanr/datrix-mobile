import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface BooleanFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: boolean) => void;
  error?: string;
}

/**
 * Boolean toggle field for yes/no question types
 */
export function BooleanField({ question, value, onChange, error }: BooleanFieldProps) {
  const boolValue = value === true || value === 'true';

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

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => onChange(true)}
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: boolValue ? colors.success[50] : colors.neutral[100],
            borderRadius: 12,
            borderWidth: boolValue ? 2 : 1,
            borderColor: boolValue ? colors.success[500] : colors.neutral[200],
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: boolValue ? '600' : '400',
              color: boolValue ? colors.success[700] : colors.neutral[600],
            }}
          >
            כן
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange(false)}
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: value === false ? colors.danger[50] : colors.neutral[100],
            borderRadius: 12,
            borderWidth: value === false ? 2 : 1,
            borderColor: value === false ? colors.danger[500] : colors.neutral[200],
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: value === false ? '600' : '400',
              color: value === false ? colors.danger[700] : colors.neutral[600],
            }}
          >
            לא
          </Text>
        </Pressable>
      </View>

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}
    </View>
  );
}
