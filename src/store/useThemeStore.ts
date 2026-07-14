import { create } from 'zustand'
import type { ThemeMeta, CustomTheme } from '../types'
import { BUILTIN_THEMES } from '../lib/themes/builtin'
import { getCustomThemes, deleteCustomTheme as deleteCustomThemeDb } from '../lib/storage/customThemes'

interface ThemeState {
  builtinThemes: ThemeMeta[]
  customThemes: CustomTheme[]
  selectedThemeId: string
  websiteThemeId: string
  loadCustomThemes: () => Promise<void>
  selectTheme: (id: string) => void
  setWebsiteTheme: (id: string) => void
  addCustomTheme: (theme: CustomTheme) => void
  deleteCustomTheme: (id: string) => Promise<void>
  getAllThemes: () => ThemeMeta[]
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  builtinThemes: BUILTIN_THEMES,
  customThemes: [],
  selectedThemeId: localStorage.getItem('gzh_selected_theme') || BUILTIN_THEMES[0].id,
  websiteThemeId: localStorage.getItem('gzh_website_theme') || 'moyu-green',

  loadCustomThemes: async () => {
    const customs = await getCustomThemes()
    set({ customThemes: customs })
  },

  selectTheme: (id: string) => {
    localStorage.setItem('gzh_selected_theme', id)
    set({ selectedThemeId: id })
  },

  setWebsiteTheme: (id: string) => {
    localStorage.setItem('gzh_website_theme', id)
    set({ websiteThemeId: id })
  },

  addCustomTheme: (theme: CustomTheme) => {
    set((state) => ({ customThemes: [...state.customThemes, theme] }))
  },

  deleteCustomTheme: async (id: string) => {
    await deleteCustomThemeDb(id)
    const state = get()
    // 如果删除的是当前选中的主题，切回第一个内置主题
    if (state.selectedThemeId === id) {
      set({ selectedThemeId: BUILTIN_THEMES[0].id })
    }
    set({ customThemes: state.customThemes.filter((t) => t.id !== id) })
  },

  getAllThemes: () => {
    const state = get()
    return [...state.builtinThemes, ...state.customThemes]
  },
}))
