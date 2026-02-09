import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue, QuestionOption } from '@/lib/types';

interface SelectFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string | string[]) => void;
  error?: string;
}

function ChevronDownIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
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
        stroke={colors.primary[600]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke={colors.neutral[400]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SEARCH_THRESHOLD = 8;

/**
 * Select/MultiSelect field for dropdown question types
 */
export function SelectField({ question, value, onChange, error }: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isMulti = question.type === 'multiSelect';
  const options: QuestionOption[] = (() => {
    const raw = question.optionsJson;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  })();

  const showSearch = options.length > SEARCH_THRESHOLD;

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Normalize value to array for consistent handling
  const selectedValues: string[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value
      ? [value]
      : [];

  const getDisplayValue = (): string => {
    if (selectedValues.length === 0) return '';

    if (isMulti && selectedValues.length > 1) {
      return `${selectedValues.length} אפשרויות נבחרו`;
    }

    const labels = selectedValues
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);

    return labels.join(', ');
  };

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const handleOpen = () => {
    setSearchQuery('');
    setIsOpen(true);
  };

  const displayValue = getDisplayValue();

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
          numberOfLines={1}
        >
          {displayValue || 'בחר אפשרות...'}
        </Text>
        <ChevronDownIcon />
      </Pressable>

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}

      {/* Options Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
          {/* Modal Header */}
          <View
            style={{
              paddingTop: insets.top,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0, 0, 0, 0.08)',
              paddingHorizontal: 16,
              paddingBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={8}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: colors.primary[600],
                  }}
                >
                  סגור
                </Text>
              </Pressable>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: colors.neutral[900],
                }}
              >
                {isMulti ? 'בחר אפשרויות' : 'בחר אפשרות'}
              </Text>
              {isMulti ? (
                <Pressable
                  onPress={() => setIsOpen(false)}
                  hitSlop={8}
                >
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
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>

            {/* Search input */}
            {showSearch && (
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  backgroundColor: colors.neutral[100],
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginTop: 12,
                  gap: 8,
                }}
              >
                <SearchIcon size={18} />
                <TextInput
                  placeholder="חיפוש..."
                  placeholderTextColor={colors.neutral[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.neutral[900],
                    textAlign: 'right',
                    padding: 0,
                  }}
                  autoFocus
                />
              </View>
            )}
          </View>

          {/* Options List */}
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {filteredOptions.length === 0 ? (
              <View
                style={{
                  padding: 32,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.neutral[500],
                  }}
                >
                  לא נמצאו תוצאות
                </Text>
              </View>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      backgroundColor: isSelected
                        ? colors.primary[50]
                        : colors.neutral[50],
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? colors.primary[500]
                        : colors.neutral[200],
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: colors.neutral[900],
                        fontWeight: isSelected ? '600' : '400',
                        textAlign: 'right',
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </Text>
                    {isSelected && <CheckIcon />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
