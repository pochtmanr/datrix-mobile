import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue, ProjectData } from '@/lib/types';

interface MasterDataFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  projectData: ProjectData[];
  error?: string;
}

/**
 * Master-data lookup field.
 * Reads options from the project_data table keyed by question.masterDataCode,
 * renders a searchable dropdown.
 */
export function MasterDataField({
  question,
  value,
  onChange,
  projectData,
  error,
}: MasterDataFieldProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedValue = typeof value === 'string' ? value : '';

  // Find the matching project_data row by code
  const dataSource = useMemo(() => {
    const code = question.masterDataCode;
    if (!code) return [];
    const entry = projectData.find((pd) => pd.code === code);
    if (!entry || !Array.isArray(entry.values)) return [];
    return entry.values as { label: string; value: string }[];
  }, [question.masterDataCode, projectData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return dataSource;
    const q = search.trim().toLowerCase();
    return dataSource.filter(
      (item) =>
        item.label?.toLowerCase().includes(q) ||
        item.value?.toLowerCase().includes(q)
    );
  }, [dataSource, search]);

  const selectedLabel = useMemo(() => {
    const found = dataSource.find((item) => item.value === selectedValue);
    return found?.label ?? selectedValue;
  }, [dataSource, selectedValue]);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-base font-medium text-foreground">
        {question.text}
        {question.isRequired && <Text className="text-danger"> *</Text>}
      </Text>
      {question.helpText && (
        <Text className="mb-2 text-sm text-muted-foreground">
          {question.helpText}
        </Text>
      )}

      {/* Selected value / trigger */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: colors.neutral[100],
          borderRadius: 12,
          padding: 14,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger[500] : colors.neutral[200],
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: selectedValue ? colors.neutral[900] : colors.neutral[400],
            textAlign: 'right',
          }}
        >
          {selectedValue ? selectedLabel : 'בחר ערך...'}
        </Text>
        <Text style={{ fontSize: 12, color: colors.neutral[400] }}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Dropdown */}
      {isOpen && (
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.neutral[200],
            marginTop: 4,
            maxHeight: 250,
            overflow: 'hidden',
          }}
        >
          {/* Search bar */}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="חיפוש..."
            placeholderTextColor={colors.neutral[400]}
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.neutral[100],
              fontSize: 14,
              textAlign: 'right',
              color: colors.neutral[900],
            }}
          />

          {filtered.length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.neutral[400], fontSize: 14 }}>
                לא נמצאו תוצאות
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 200 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={({ pressed }) => ({
                      padding: 12,
                      backgroundColor: isSelected
                        ? colors.primary[50]
                        : pressed
                          ? colors.neutral[50]
                          : 'white',
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: 8,
                    })}
                  >
                    {isSelected && (
                      <Text style={{ color: colors.primary[600], fontWeight: '600' }}>✓</Text>
                    )}
                    <Text
                      style={{
                        flex: 1,
                        textAlign: 'right',
                        fontSize: 15,
                        color: isSelected ? colors.primary[700] : colors.neutral[900],
                        fontWeight: isSelected ? '500' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}

      {error && (
        <Text className="mt-1 text-sm text-danger">{error}</Text>
      )}
    </View>
  );
}
