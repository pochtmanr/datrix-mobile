import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnswerValue, PhotoUploadItem } from '@/lib/types';

/**
 * Current form-filling session state store
 * Persisted to survive app restarts during active survey filling
 */

interface DraftState {
  // Active survey session
  activeRecordId: string | null;
  activeQuestionnaireId: string | null;
  activeProjectId: string | null;
  activePage: number;
  activeSection: number;

  // Unsaved answers (keyed by `${questionId}_${pageId || 'default'}`)
  unsavedAnswers: Record<string, AnswerValue>;

  // Photo upload queue
  photoQueue: PhotoUploadItem[];

  // Form state
  isDirty: boolean;
  lastSavedAt: Date | null;

  // Actions
  setActiveRecord: (
    recordId: string | null,
    questionnaireId?: string | null,
    projectId?: string | null
  ) => void;
  setActivePage: (page: number) => void;
  setActiveSection: (section: number) => void;
  setAnswer: (
    questionId: string,
    value: AnswerValue,
    pageId?: string | null
  ) => void;
  removeAnswer: (questionId: string, pageId?: string | null) => void;
  getAnswer: (
    questionId: string,
    pageId?: string | null
  ) => AnswerValue | undefined;
  addPhotoToQueue: (photo: PhotoUploadItem) => void;
  updatePhotoStatus: (
    photoId: string,
    status: PhotoUploadItem['status'],
    remoteUrl?: string | null,
    error?: string | null
  ) => void;
  removePhotoFromQueue: (photoId: string) => void;
  setDirty: (dirty: boolean) => void;
  setLastSavedAt: (date: Date | null) => void;
  clearDraft: () => void;
  clearAll: () => void;
}

const initialState = {
  activeRecordId: null,
  activeQuestionnaireId: null,
  activeProjectId: null,
  activePage: 1,
  activeSection: 0,
  unsavedAnswers: {},
  photoQueue: [],
  isDirty: false,
  lastSavedAt: null,
};

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveRecord: (recordId, questionnaireId = null, projectId = null) =>
        set({
          activeRecordId: recordId,
          activeQuestionnaireId: questionnaireId,
          activeProjectId: projectId,
          activePage: 1,
          activeSection: 0,
          unsavedAnswers: {},
          isDirty: false,
        }),

      setActivePage: (page) => set({ activePage: page }),

      setActiveSection: (section) => set({ activeSection: section }),

      setAnswer: (questionId, value, pageId = null) => {
        const key = `${questionId}_${pageId || 'default'}`;
        set((state) => ({
          unsavedAnswers: { ...state.unsavedAnswers, [key]: value },
          isDirty: true,
        }));
      },

      removeAnswer: (questionId, pageId = null) => {
        const key = `${questionId}_${pageId || 'default'}`;
        set((state) => {
          const newAnswers = { ...state.unsavedAnswers };
          delete newAnswers[key];
          return { unsavedAnswers: newAnswers, isDirty: true };
        });
      },

      getAnswer: (questionId, pageId = null) => {
        const key = `${questionId}_${pageId || 'default'}`;
        return get().unsavedAnswers[key];
      },

      addPhotoToQueue: (photo) =>
        set((state) => ({
          photoQueue: [...state.photoQueue, photo],
        })),

      updatePhotoStatus: (photoId, status, remoteUrl = null, error = null) =>
        set((state) => ({
          photoQueue: state.photoQueue.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  status,
                  remoteUrl: remoteUrl ?? p.remoteUrl,
                  error: error ?? p.error,
                  retryCount:
                    status === 'failed' ? p.retryCount + 1 : p.retryCount,
                }
              : p
          ),
        })),

      removePhotoFromQueue: (photoId) =>
        set((state) => ({
          photoQueue: state.photoQueue.filter((p) => p.id !== photoId),
        })),

      setDirty: (dirty) => set({ isDirty: dirty }),

      setLastSavedAt: (date) => set({ lastSavedAt: date, isDirty: false }),

      clearDraft: () =>
        set({
          unsavedAnswers: {},
          isDirty: false,
          activePage: 1,
          activeSection: 0,
        }),

      clearAll: () => set(initialState),
    }),
    {
      name: 'datrix-draft-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
