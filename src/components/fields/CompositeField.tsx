import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { BooleanField } from './BooleanField';
import type { Question, AnswerValue, CompositeField as CompositeFieldType } from '@/lib/types';

interface CompositeFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
}

/**
 * Composite field renders a group of sub-fields defined by question.compositeFieldsJson.
 * The value is a JSON object keyed by sub-field code.
 */
export function CompositeField({
  question,
  value,
  onChange,
  error,
}: CompositeFieldProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const compositeFields: CompositeFieldType[] = question.compositeFieldsJson ?? [];
  const compositeValue: Record<string, AnswerValue> =
    typeof value === 'object' && value !== null && !Array.isArray(value) && !('latitude' in value)
      ? (value as Record<string, AnswerValue>)
      : {};

  const handleSubFieldChange = useCallback(
    (code: string, subValue: AnswerValue) => {
      onChange({ ...compositeValue, [code]: subValue });
    },
    [compositeValue, onChange]
  );

  const filledCount = compositeFields.filter(
    (f) => compositeValue[f.code] !== undefined && compositeValue[f.code] !== null && compositeValue[f.code] !== ''
  ).length;

  return (
    <View className="mb-4">
      {/* Header / Toggle */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={{
          backgroundColor: colors.neutral[50],
          borderRadius: 12,
          padding: 14,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger[500] : colors.neutral[200],
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.neutral[900],
              textAlign: 'right',
            }}
          >
            {question.text}
            {question.isRequired && (
              <Text style={{ color: colors.danger[500] }}> *</Text>
            )}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.neutral[500],
              textAlign: 'right',
              marginTop: 2,
            }}
          >
            {filledCount}/{compositeFields.length} שדות מולאו
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.neutral[400] }}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {question.helpText && (
        <Text className="mb-2 mt-1 text-sm text-muted-foreground">
          {question.helpText}
        </Text>
      )}

      {/* Sub-fields */}
      {isExpanded && (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 4,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary[200],
            marginLeft: 4,
          }}
        >
          {compositeFields.map((field) => {
            const subQuestion: Question = {
              id: `${question.id}_${field.code}`,
              questionnaireId: question.questionnaireId,
              projectId: question.projectId,
              type: field.type,
              text: field.label,
              code: field.code,
              orderIndex: 0,
              isRequired: field.isRequired ?? false,
              optionsJson: field.options ?? null,
              helpText: null,
              sectionName: null,
              aiAnalysisEnabled: false,
              aiAnalysisPrompt: null,
              aiAnalysisSchema: null,
              masterDataCode: null,
              masterDataConfig: null,
              compositeFieldsJson: null,
              createdDate: '',
              updatedAt: '',
            };

            const subValue = compositeValue[field.code] ?? null;

            return (
              <SubField
                key={field.code}
                subQuestion={subQuestion}
                value={subValue}
                onChange={(v) => handleSubFieldChange(field.code, v)}
              />
            );
          })}
        </View>
      )}

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}
    </View>
  );
}

/** Renders the correct primitive field for a composite sub-field. */
function SubField({
  subQuestion,
  value,
  onChange,
}: {
  subQuestion: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  switch (subQuestion.type) {
    case 'text':
    case 'textarea':
      return <TextField question={subQuestion} value={value} onChange={onChange} />;
    case 'number':
      return <NumberField question={subQuestion} value={value} onChange={onChange} />;
    case 'select':
    case 'multiSelect':
      return <SelectField question={subQuestion} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanField question={subQuestion} value={value} onChange={onChange} />;
    default:
      return <TextField question={subQuestion} value={value} onChange={onChange} />;
  }
}
