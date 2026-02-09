/**
 * Core entity types for Datrix Mobile
 * All types use camelCase properties (conversion from DB snake_case happens in API layer)
 */

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'viewer' | 'owner' | 'surveyor';

export interface AppUser {
  id: string;
  authUserId: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: UserRole;
  userRole: string | null; // Legacy
  employeeNumber: string | null;
  isActive: boolean;
  phone: string | null;
  phoneNumber: string | null; // Legacy
  profileImage: string | null;
  pushToken: string | null;
  createdDate: string;
  updatedAt: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  clientId: string | null;
  name: string | null;
  code: string | null;
  description: string | null;
  category: string | null;
  startDate: string | null;
  status: string | null;
  isActive: boolean;
  createdDate: string;
  updatedAt: string;
}

export interface ProjectUser {
  id: string;
  projectId: string;
  userId: string;
  role: string | null;
  createdDate: string;
  updatedAt: string;
}

export interface ProjectData {
  id: string;
  projectId: string;
  name: string | null;
  code: string | null;
  values: unknown; // JSONB
  isActive: boolean;
  createdDate: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  projectId: string;
  code: string | null;
  name: string | null;
  isActive: boolean;
  createdDate: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  projectId: string;
  code: string | null;
  name: string | null;
  isActive: boolean;
  createdDate: string;
  updatedAt: string;
}

// ============================================================================
// Questionnaire Types
// ============================================================================

export type QuestionnaireStatus = 'draft' | 'active';

export interface Questionnaire {
  id: string;
  projectId: string;
  name: string | null;
  code: string | null;
  description: string | null;
  version: string | null;
  status: QuestionnaireStatus;
  isActive: boolean;
  createdDate: string;
  updatedAt: string;
}

export interface QuestionnaireAssignment {
  id: string;
  questionnaireId: string;
  userId: string;
  role: string | null;
  createdDate: string;
  updatedAt: string;
}

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'multiSelect'
  | 'boolean'
  | 'gps'
  | 'photo'
  | 'readonlyText'
  | 'masterDataQuestion'
  | 'lookupAutofill'
  | 'composite';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface CompositeField {
  code: string;
  label: string;
  type: QuestionType;
  isRequired?: boolean;
  options?: QuestionOption[];
}

export interface Question {
  id: string;
  questionnaireId: string;
  projectId: string;
  type: QuestionType;
  text: string | null;
  code: string | null;
  orderIndex: number;
  isRequired: boolean;
  optionsJson: QuestionOption[] | null;
  helpText: string | null;
  sectionName: string | null;
  aiAnalysisEnabled: boolean;
  aiAnalysisPrompt: string | null;
  aiAnalysisSchema: unknown | null;
  masterDataCode: string | null;
  masterDataConfig: string | null;
  compositeFieldsJson: CompositeField[] | null;
  createdDate: string;
  updatedAt: string;
}

// ============================================================================
// Record Types
// ============================================================================

export type RecordStatus =
  | 'not_started'
  | 'in_progress'
  | 'form_filled'
  | 'handled'
  | 'sent_to_control'
  | 'passed_quality_control';

export interface Record {
  id: string;
  projectId: string;
  questionnaireId: string;
  assigneeId: string;
  externalId: string | null;
  serialNumber: string | null;
  status: RecordStatus;
  hasQuestionnaire: boolean;
  area: string | null;
  category: string | null;
  locationInfo: string | null;
  colorTag: string | null;
  color: string | null;
  startTime: string | null;
  endTime: string | null;
  processedAt: string | null;
  createdDate: string;
  updatedAt: string;
}

export interface RecordAnswer {
  id: string;
  recordId: string;
  questionId: string;
  pageId: string | null;
  value: string | null;
  displayValue: string | null;
  aiAnalysisResult: string | null;
  createdBy: string | null;
  createdDate: string;
  updatedAt: string;
}

export interface RecordPage {
  id: string;
  recordId: string;
  pageNumber: number;
  status: string;
  createdDate: string;
  updatedAt: string;
}

export interface RecordFile {
  id: string;
  recordId: string;
  projectId: string;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: string | null;
  uploadedById: string | null;
  pageNumber: number | null;
  createdDate: string;
  updatedAt: string;
}

export interface RecordLocation {
  id: string;
  recordId: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  createdDate: string;
  updatedAt: string;
}

export interface RecordNote {
  id: string;
  recordId: string;
  authorId: string;
  text: string | null;
  createdDate: string;
  updatedAt: string;
}

export interface RecordStatusHistory {
  id: string;
  recordId: string;
  status: RecordStatus;
  comment: string | null;
  createdById: string | null;
  isPrimary: boolean;
  eventTime: string | null;
  createdDate: string;
  updatedAt: string;
}

// ============================================================================
// Form State Types
// ============================================================================

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | { latitude: number; longitude: number; accuracy?: number }
  | { [key: string]: unknown }
  | null;

export interface DraftAnswer {
  questionId: string;
  pageId: string | null;
  value: AnswerValue;
  displayValue: string | null;
}

// ============================================================================
// Photo Queue Types
// ============================================================================

export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface PhotoUploadItem {
  id: string;
  localUri: string;
  recordId: string;
  questionId: string;
  pageId: string | null;
  status: PhotoUploadStatus;
  retryCount: number;
  remoteUrl: string | null;
  error: string | null;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncError {
  table: string;
  recordId: string;
  error: string;
  timestamp: string;
}

export interface SyncMetadata {
  tableName: string;
  lastPulled: string | null;
  lastPushed: string | null;
  pending: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  '(auth)': undefined;
  '(surveyor)': undefined;
  '(manager)': undefined;
};

// ============================================================================
// Insert/Update Types (for mutations)
// ============================================================================

export type RecordInsert = {
  id?: string;
  projectId: string;
  questionnaireId: string;
  assigneeId: string;
  externalId?: string | null;
  serialNumber?: string | null;
  status?: RecordStatus;
  hasQuestionnaire?: boolean;
  area?: string | null;
  category?: string | null;
  locationInfo?: string | null;
  colorTag?: string | null;
  color?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  processedAt?: string | null;
};

export type RecordAnswerInsert = {
  id?: string;
  recordId: string;
  questionId: string;
  pageId?: string | null;
  value?: string | null;
  displayValue?: string | null;
  aiAnalysisResult?: string | null;
  createdBy?: string | null;
};

export type RecordPageInsert = Omit<
  RecordPage,
  'id' | 'createdDate' | 'updatedAt'
> & {
  id?: string;
};

export type RecordFileInsert = Omit<
  RecordFile,
  'id' | 'createdDate' | 'updatedAt'
> & {
  id?: string;
};

export type RecordLocationInsert = Omit<
  RecordLocation,
  'id' | 'createdDate' | 'updatedAt'
> & {
  id?: string;
};

export type RecordNoteInsert = Omit<
  RecordNote,
  'id' | 'createdDate' | 'updatedAt'
> & {
  id?: string;
};

export type RecordStatusHistoryInsert = Omit<
  RecordStatusHistory,
  'id' | 'createdDate' | 'updatedAt'
> & {
  id?: string;
};
