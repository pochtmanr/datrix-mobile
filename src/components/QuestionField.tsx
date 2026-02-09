import React from 'react';
import {
  TextField,
  NumberField,
  SelectField,
  BooleanField,
  DateField,
  TimeField,
  GPSField,
  PhotoField,
  ReadonlyField,
  MasterDataField,
  CompositeField,
  LookupAutofillField,
} from '@/components/fields';
import type { Question, AnswerValue, ProjectData } from '@/lib/types';

interface QuestionFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  recordId: string;
  pageId?: string | null;
  error?: string;
  /** Project data for master-data and lookup fields */
  projectData?: ProjectData[];
  /** Called when a lookup-autofill field selects a row, for populating sibling fields */
  onAutofill?: (row: Record<string, string>) => void;
}

/**
 * Renders the appropriate field component based on question type
 */
export function QuestionField({
  question,
  value,
  onChange,
  recordId,
  pageId,
  error,
  projectData = [],
  onAutofill,
}: QuestionFieldProps) {
  switch (question.type) {
    case 'text':
    case 'textarea':
      return (
        <TextField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'number':
      return (
        <NumberField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'select':
    case 'multiSelect':
      return (
        <SelectField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'date':
      return (
        <DateField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'time':
      return (
        <TimeField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'gps':
      return (
        <GPSField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'photo':
      return (
        <PhotoField
          question={question}
          value={value}
          onChange={onChange}
          recordId={recordId}
          pageId={pageId}
          error={error}
        />
      );

    case 'readonlyText':
      return <ReadonlyField question={question} value={value} />;

    case 'masterDataQuestion':
      return (
        <MasterDataField
          question={question}
          value={value}
          onChange={onChange}
          projectData={projectData}
          error={error}
        />
      );

    case 'lookupAutofill':
      return (
        <LookupAutofillField
          question={question}
          value={value}
          onChange={onChange}
          onAutofill={onAutofill}
          projectData={projectData}
          error={error}
        />
      );

    case 'composite':
      return (
        <CompositeField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    default:
      return (
        <TextField
          question={question}
          value={value}
          onChange={onChange}
          error={error}
        />
      );
  }
}
