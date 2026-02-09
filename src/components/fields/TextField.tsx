import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface TextFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Text input field for text and textarea question types
 */
export function TextField({ question, value, onChange, error }: TextFieldProps) {
  const isMultiline = question.type === 'textarea';
  const stringValue = typeof value === 'string' ? value : '';

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
      <TextInput
        value={stringValue}
        onChangeText={onChange}
        placeholder="הזן תשובה..."
        placeholderTextColor={colors.neutral[400]}
        multiline={isMultiline}
        numberOfLines={isMultiline ? 4 : 1}
        textAlignVertical={isMultiline ? 'top' : 'center'}
        style={{
          backgroundColor: colors.neutral[100],
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          color: colors.neutral[900],
          textAlign: 'right',
          minHeight: isMultiline ? 100 : 48,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger[500] : colors.neutral[200],
        }}
      />
      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}
    </View>
  );
}
