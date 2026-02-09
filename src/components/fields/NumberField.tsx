import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue } from '@/lib/types';

interface NumberFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: number | null) => void;
  error?: string;
}

/**
 * Number input field for numeric question types
 */
export function NumberField({ question, value, onChange, error }: NumberFieldProps) {
  const stringValue = value !== null && value !== undefined ? String(value) : '';

  const handleChange = (text: string) => {
    // Allow empty string
    if (text === '') {
      onChange(null);
      return;
    }

    // Parse number (support Hebrew/RTL input)
    const cleaned = text.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);

    if (!isNaN(num)) {
      onChange(num);
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
      <TextInput
        value={stringValue}
        onChangeText={handleChange}
        placeholder="הזן מספר..."
        placeholderTextColor={colors.neutral[400]}
        keyboardType="numeric"
        style={{
          backgroundColor: colors.neutral[100],
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          color: colors.neutral[900],
          textAlign: 'right',
          height: 48,
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
