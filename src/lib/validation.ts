import type { Question, RecordAnswer, AnswerValue } from '@/lib/types';

export interface ValidationError {
  questionId: string;
  sectionName: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Checks if a single answer value is considered "filled".
 */
function isAnswerFilled(value: AnswerValue): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // GPS object — must have lat + lng
    const gps = value as { latitude?: number; longitude?: number };
    return typeof gps.latitude === 'number' && typeof gps.longitude === 'number';
  }
  return true;
}

/**
 * Validates all required questions have answers before form submission.
 * Returns a ValidationResult with per-question error details.
 */
export function validateSubmission(
  questions: Question[],
  answers: RecordAnswer[],
  draftAnswers: Record<string, AnswerValue>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const question of questions) {
    if (!question.isRequired) continue;

    const section = question.sectionName || 'כללי';

    // Check persisted answer first
    const persisted = answers.find((a) => a.questionId === question.id);
    const draftKey = `${question.id}_default`;
    const draftValue = draftAnswers[draftKey];

    // Draft takes precedence over persisted
    const effectiveValue: AnswerValue = draftValue !== undefined
      ? draftValue
      : persisted?.value != null
        ? parseSavedValue(persisted.value, question.type)
        : null;

    if (!isAnswerFilled(effectiveValue)) {
      errors.push({
        questionId: question.id,
        sectionName: section,
        message: `שדה חובה: ${question.text ?? question.code ?? 'ללא שם'}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parses a saved string value back into the appropriate AnswerValue type.
 */
function parseSavedValue(raw: string, type: string): AnswerValue {
  if (!raw) return null;

  switch (type) {
    case 'number':
      return raw;
    case 'boolean':
      return raw === 'true';
    case 'multiSelect':
      try { return JSON.parse(raw) as string[]; } catch { return null; }
    case 'gps':
      try { return JSON.parse(raw) as { latitude: number; longitude: number; accuracy?: number }; } catch { return null; }
    default:
      return raw;
  }
}

/**
 * Returns the index of the first section containing a validation error,
 * useful for auto-scrolling to the problematic section.
 */
export function getFirstErrorSectionIndex(
  errors: ValidationError[],
  sectionNames: string[]
): number {
  if (errors.length === 0) return -1;
  const firstErrorSection = errors[0].sectionName;
  const idx = sectionNames.indexOf(firstErrorSection);
  return idx >= 0 ? idx : 0;
}
