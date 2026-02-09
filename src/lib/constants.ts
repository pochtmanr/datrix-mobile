import type { RecordStatus, UserRole } from './types';

/**
 * Application constants for Datrix Mobile
 */

// ============================================================================
// Status Labels (Hebrew)
// ============================================================================

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  not_started: 'לא התחיל',
  in_progress: 'בתהליך',
  form_filled: 'מולא',
  handled: 'טופל',
  sent_to_control: 'נשלח לבקרה',
  passed_quality_control: 'עבר בקרה',
};

export const RECORD_STATUS_LABELS_EN: Record<RecordStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  form_filled: 'Form Filled',
  handled: 'Handled',
  sent_to_control: 'Sent to Control',
  passed_quality_control: 'Passed QC',
};

// ============================================================================
// Status Colors (HeroUI color variants)
// ============================================================================

// HeroUI Chip color type: 'accent' | 'default' | 'success' | 'warning' | 'danger'
export const RECORD_STATUS_COLORS: Record<
  RecordStatus,
  'accent' | 'default' | 'success' | 'warning' | 'danger'
> = {
  not_started: 'default',
  in_progress: 'warning',
  form_filled: 'success',
  handled: 'default',
  sent_to_control: 'accent',
  passed_quality_control: 'success',
};

// ============================================================================
// Role Labels (Hebrew)
// ============================================================================

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'מנהל מערכת',
  manager: 'מנהל פרויקט',
  viewer: 'צופה',
  owner: 'בעלים',
  surveyor: 'סוקר',
};

export const USER_ROLE_LABELS_EN: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Project Manager',
  viewer: 'Viewer',
  owner: 'Owner',
  surveyor: 'Surveyor',
};

// Alias for backward compatibility
export const ROLE_LABELS = USER_ROLE_LABELS;

// ============================================================================
// Status Workflow
// ============================================================================

export const STATUS_WORKFLOW_ORDER: RecordStatus[] = [
  'not_started',
  'in_progress',
  'form_filled',
  'handled',
  'sent_to_control',
  'passed_quality_control',
];

// Surveyor can only transition to these statuses
export const SURVEYOR_ALLOWED_TRANSITIONS: RecordStatus[] = [
  'in_progress',
  'form_filled',
];

// Managers can transition to any status
export const MANAGER_ALLOWED_TRANSITIONS: RecordStatus[] = STATUS_WORKFLOW_ORDER;

// ============================================================================
// Supabase Configuration
// ============================================================================

export const SUPABASE_URL = 'https://zbtjfjflfvtsoctubtnx.supabase.co';

// Storage bucket names
export const STORAGE_BUCKETS = {
  MAIN: 'main',
  AVATARS: 'avatars',
} as const;

// Storage paths
export const STORAGE_PATHS = {
  RECORD_PHOTOS: (recordId: string, filename: string) =>
    `records/${recordId}/${Date.now()}_${filename}`,
  PROFILE_PHOTOS: (userId: string, filename: string) =>
    `${userId}/${Date.now()}_${filename}`,
} as const;

// ============================================================================
// Sync Configuration
// ============================================================================

export const SYNC_CONFIG = {
  PULL_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  PUSH_DEBOUNCE_MS: 3 * 1000, // 3 seconds
  MAX_RETRIES: 5,
  RETRY_BACKOFF: [1000, 2000, 4000, 8000, 16000], // exponential backoff
} as const;

// ============================================================================
// Photo Configuration
// ============================================================================

export const PHOTO_CONFIG = {
  MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  COMPRESS_QUALITY: 0.8,
  THUMBNAIL_SIZE: 50,
  MAX_DIMENSION: 1920,
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  TOAST_DURATION_MS: 3000,
  DEBOUNCE_MS: 300,
  LIST_PAGE_SIZE: 50,
} as const;

// ============================================================================
// Question Type Labels (Hebrew)
// ============================================================================

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'טקסט',
  textarea: 'טקסט ארוך',
  number: 'מספר',
  date: 'תאריך',
  time: 'שעה',
  select: 'בחירה',
  multiSelect: 'בחירה מרובה',
  boolean: 'כן/לא',
  gps: 'מיקום GPS',
  photo: 'צילום',
  readonlyText: 'טקסט קריאה בלבד',
  masterDataQuestion: 'נתוני אב',
  lookupAutofill: 'מילוי אוטומטי',
  composite: 'שדה מורכב',
};

// ============================================================================
// Tab Configuration
// ============================================================================

export const SURVEYOR_TABS = [
  { name: 'index', title: 'בית', icon: 'home' },
  { name: 'projects', title: 'פרויקטים', icon: 'folder' },
  { name: 'tasks', title: 'משימות', icon: 'check-square' },
  { name: 'profile', title: 'פרופיל', icon: 'user' },
] as const;

export const MANAGER_TABS = [
  { name: 'index', title: 'לוח בקרה', icon: 'bar-chart-2' },
  { name: 'projects', title: 'פרויקטים', icon: 'folder' },
  { name: 'reports', title: 'דוחות', icon: 'file-text' },
  { name: 'profile', title: 'פרופיל', icon: 'user' },
] as const;
