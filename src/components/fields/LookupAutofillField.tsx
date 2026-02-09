import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { colors } from '@/theme/colors';
import type { Question, AnswerValue, ProjectData } from '@/lib/types';

interface LookupAutofillFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: string) => void;
  /** Called when a lookup row is selected, passing the full row for autofill. */
  onAutofill?: (row: Record<string, string>) => void;
  projectData: ProjectData[];
  error?: string;
}

/**
 * Lookup-autofill field: user selects from a master-data list,
 * and other fields in the form are automatically populated from the selected row.
 *
 * The `masterDataConfig` JSON on the question defines the mapping:
 * { "sourceCode": "some_project_data_code", "mappings": [{ "sourceKey": "city", "targetQuestionCode": "q_city" }] }
 */
export function LookupAutofillField({
  question,
  value,
  onChange,
  onAutofill,
  projectData,
  error,
}: LookupAutofillFieldProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedValue = typeof value === 'string' ? value : '';

  // Parse master data config
  const config = useMemo(() => {
    if (!question.masterDataConfig) return null;
    try {
      return JSON.parse(question.masterDataConfig) as {
        sourceCode: string;
        mappings?: { sourceKey: string; targetQuestionCode: string }[];
      };
    } catch {
      return null;
    }
  }, [question.masterDataConfig]);

  // Get data source rows
  const dataRows = useMemo(() => {
    const code = config?.sourceCode ?? question.masterDataCode;
    if (!code) return [];
    const entry = projectData.find((pd) => pd.code === code);
    if (!entry || !Array.isArray(entry.values)) return [];
    return entry.values as Record<string, string>[];
  }, [config?.sourceCode, question.masterDataCode, projectData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return dataRows;
    const q = search.trim().toLowerCase();
    return dataRows.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [dataRows, search]);

  // Determine display label for a row (use first string field or 'label' key)
  const getRowLabel = useCallback((row: Record<string, string>) => {
    return row.label ?? row.name ?? Object.values(row)[0] ?? '';
  }, []);

  const getRowValue = useCallback((row: Record<string, string>) => {
    return row.value ?? row.code ?? row.id ?? getRowLabel(row);
  }, [getRowLabel]);

  const selectedLabel = useMemo(() => {
    const found = dataRows.find((row) => getRowValue(row) === selectedValue);
    return found ? getRowLabel(found) : selectedValue;
  }, [dataRows, selectedValue, getRowLabel, getRowValue]);

  const handleSelect = useCallback(
    (row: Record<string, string>) => {
      onChange(getRowValue(row));
      setIsOpen(false);
      setSearch('');
      // Trigger autofill of dependent fields
      if (onAutofill) {
        onAutofill(row);
      }
    },
    [onChange, onAutofill, getRowValue]
  );

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

      {/* Trigger */}
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
            flex: 1,
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
              keyExtractor={(item, idx) => getRowValue(item) || String(idx)}
              style={{ maxHeight: 200 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = getRowValue(item) === selectedValue;
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
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
                      {getRowLabel(item)}
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
