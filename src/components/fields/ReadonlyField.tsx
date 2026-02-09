import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface ReadonlyFieldProps {
  question: Question;
  value: AnswerValue;
}

/**
 * Read-only text display field
 */
export function ReadonlyField({ question, value }: ReadonlyFieldProps) {
  const displayValue = typeof value === 'string' ? value : '';

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-foreground">
        {question.text}
      </Text>
      {question.helpText && (
        <Text className="mb-2 text-sm text-muted-foreground">
          {question.helpText}
        </Text>
      )}
      <View
        style={{
          backgroundColor: colors.neutral[50],
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.neutral[200],
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: colors.neutral[700],
            textAlign: 'right',
          }}
        >
          {displayValue || '-'}
        </Text>
      </View>
    </View>
  );
}
