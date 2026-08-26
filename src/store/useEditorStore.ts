import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EditorMode, StreamStatus, ValidationResult } from '../types'

interface EditorState {
  mode: EditorMode
  richTextHtml: string
  markdown: string
  generatedHtml: string
  streamStatus: StreamStatus
  streamProgress: string
  validationResult: ValidationResult | null
  currentArticleId: string | null
  aiContentTrigger: string
  leftPanelOpen: boolean
  clearConfirmOpen: boolean
  clearEditorTrigger: number

  setMode: (mode: EditorMode) => void
  setRichTextHtml: (html: string) => void
  setMarkdown: (md: string) => void
  setGeneratedHtml: (html: string) => void
  setStreamStatus: (status: StreamStatus, progress?: string) => void
  setValidationResult: (result: ValidationResult | null) => void
  setCurrentArticleId: (id: string | null) => void
  reset: () => void
  setAiGeneratedContent: (html: string) => void
  setLeftPanelOpen: (open: boolean) => void
  setClearConfirmOpen: (open: boolean) => void
  clearAll: () => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      mode: 'richtext',
      richTextHtml: '',
      markdown: '',
      generatedHtml: '',
      streamStatus: 'idle' as StreamStatus,
      streamProgress: '',
      validationResult: null,
      currentArticleId: null,
      aiContentTrigger: '',
      leftPanelOpen: true,
      clearConfirmOpen: false,
      clearEditorTrigger: 0,

      setMode: (mode) => set({ mode }),
      setRichTextHtml: (html) => set({ richTextHtml: html }),
      setMarkdown: (md) => set({ markdown: md }),
      setGeneratedHtml: (html) => set({ generatedHtml: html }),
      setStreamStatus: (status, progress) => set({ streamStatus: status, streamProgress: progress || '' }),
      setValidationResult: (result) => set({ validationResult: result }),
      setCurrentArticleId: (id) => set({ currentArticleId: id }),
      setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
      setClearConfirmOpen: (open) => set({ clearConfirmOpen: open }),

      setAiGeneratedContent: (html) => {
        const key = `__ai_${Date.now()}__`
        set({ aiContentTrigger: key + html, richTextHtml: html })
      },
      clearAll: () =>
        set((state) => ({
          richTextHtml: '',
          markdown: '',
          generatedHtml: '',
          streamStatus: 'idle',
          streamProgress: '',
          validationResult: null,
          clearConfirmOpen: false,
          clearEditorTrigger: state.clearEditorTrigger + 1,
        })),
      reset: () =>
        set({
          richTextHtml: '',
          markdown: '',
          generatedHtml: '',
          streamStatus: 'idle',
          streamProgress: '',
          validationResult: null,
        }),
    }),
    {
      name: 'gzh_editor_draft',
      partialize: (state) => ({
        richTextHtml: state.richTextHtml,
        markdown: state.markdown,
        generatedHtml: state.generatedHtml,
        validationResult: state.validationResult,
      }),
    },
  ),
)
