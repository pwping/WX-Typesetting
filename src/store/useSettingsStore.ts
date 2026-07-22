import { create } from 'zustand'
import type { ApiKeyConfig } from '../types'
import { getApiKey, getSelectedProvider, setSelectedProvider, saveApiKey, deleteApiKey, saveSecret, getSecret, deleteSecret } from '../lib/storage/crypto'
import { getProvider } from '../lib/llm/providers'

interface SettingsState {
  providerId: string
  modelId: string
  apiKey: string
  isKeyValid: boolean
  showApiKeyDialog: boolean
  showCustomThemeDialog: boolean
  showBalanceAlert: boolean
  showImgbbDialog: boolean
  imgbbKey: string
  imgbbExpiration: number
  balanceAlertMessage: string
  keyVersion: number

  loadSettings: () => void
  setProvider: (providerId: string) => void
  saveKey: (providerId: string, modelId: string, apiKey: string) => void
  removeKey: (providerId: string) => void
  setShowApiKeyDialog: (show: boolean) => void
  setShowCustomThemeDialog: (show: boolean) => void
  setShowBalanceAlert: (show: boolean, message?: string) => void
  getApiKeyConfig: () => ApiKeyConfig | null
  getHtmlRenderConfig: () => ApiKeyConfig | null
  getVisionConfig: () => ApiKeyConfig | null
  loadImgbbConfig: () => void
  saveImgbbConfig: (apiKey: string, expiration: number) => void
  clearImgbbConfig: () => void
  setShowImgbbDialog: (show: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  providerId: 'deepseek',
  modelId: 'deepseek-v4-flash',
  apiKey: '',
  isKeyValid: false,
  showApiKeyDialog: false,
  showCustomThemeDialog: false,
  showBalanceAlert: false,
  balanceAlertMessage: '',
  showImgbbDialog: false,
  imgbbKey: '',
  imgbbExpiration: 0,
  keyVersion: 0,

  loadSettings: () => {
    const providerId = getSelectedProvider()
    const stored = getApiKey(providerId)
    if (stored) {
      // Auto-upgrade deprecated models
      const oldModels = ['deepseek-chat', 'deepseek-reasoner', 'moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2.5']
      const upgradeMap: Record<string, string> = {
        'deepseek-chat': 'deepseek-v4-flash',
        'deepseek-reasoner': 'deepseek-v4-flash',
        'moonshot-v1-8k': 'kimi-k2.6',
        'moonshot-v1-32k': 'kimi-k2.6',
        'kimi-k2.5': 'kimi-k2.6',
      }
      const modelId = oldModels.includes(stored.modelId)
        ? upgradeMap[stored.modelId] || stored.modelId
        : stored.modelId
      if (modelId !== stored.modelId) saveApiKey(providerId, modelId, stored.apiKey)
      set({
        providerId,
        modelId,
        apiKey: stored.apiKey,
        isKeyValid: stored.apiKey.length > 0,
      })
    } else {
      const provider = getProvider(providerId)
      set({
        providerId,
        modelId: provider?.models[0]?.id || 'deepseek-v4-flash',
        apiKey: '',
        isKeyValid: false,
      })
    }
  },

  setProvider: (providerId: string) => {
    setSelectedProvider(providerId)
    const stored = getApiKey(providerId)
    const provider = getProvider(providerId)
    if (stored) {
      set({
        providerId,
        modelId: stored.modelId,
        apiKey: stored.apiKey,
        isKeyValid: stored.apiKey.length > 0,
      })
    } else {
      set({
        providerId,
        modelId: provider?.models[0]?.id || '',
        apiKey: '',
        isKeyValid: false,
      })
    }
  },

  saveKey: (providerId, modelId, apiKey) => {
    saveApiKey(providerId, modelId, apiKey)
    set({ providerId, modelId, apiKey, isKeyValid: apiKey.length > 0, keyVersion: get().keyVersion + 1 })
  },

  removeKey: (providerId) => {
    deleteApiKey(providerId)
    set({ apiKey: '', isKeyValid: false, keyVersion: get().keyVersion + 1 })
  },

  setShowApiKeyDialog: (show) => set({ showApiKeyDialog: show }),
  setShowCustomThemeDialog: (show) => set({ showCustomThemeDialog: show }),
  setShowBalanceAlert: (show, message) => set({ showBalanceAlert: show, balanceAlertMessage: message || '' }),
  setShowImgbbDialog: (show) => set({ showImgbbDialog: show }),

  loadImgbbConfig: () => {
    const apiKey = getSecret('imgbb_api_key') || ''
    const expirationStr = getSecret('imgbb_expiration') || '0'
    set({ imgbbKey: apiKey, imgbbExpiration: parseInt(expirationStr) || 0 })
  },
  saveImgbbConfig: (apiKey, expiration) => {
    saveSecret('imgbb_api_key', apiKey)
    saveSecret('imgbb_expiration', String(expiration))
    set({ imgbbKey: apiKey, imgbbExpiration: expiration })
  },
  clearImgbbConfig: () => {
    deleteSecret('imgbb_api_key')
    deleteSecret('imgbb_expiration')
    set({ imgbbKey: '', imgbbExpiration: 0 })
  },

  getApiKeyConfig: () => {
    const state = get()
    if (!state.apiKey) return null
    return {
      providerId: state.providerId,
      modelId: state.modelId,
      apiKey: state.apiKey,
    }
  },

  // HTML 排版渲染：deepseek 便宜优先，没有则用 kimi，都无则用当前
  getHtmlRenderConfig: (): ApiKeyConfig | null => {
    const deepseekKey = getApiKey('deepseek')
    if (deepseekKey?.apiKey) {
      return { providerId: 'deepseek', modelId: deepseekKey.modelId, apiKey: deepseekKey.apiKey }
    }
    const kimiKey = getApiKey('moonshot')
    if (kimiKey?.apiKey) {
      const provider = getProvider('moonshot')
      return { providerId: 'moonshot', modelId: kimiKey.modelId, apiKey: kimiKey.apiKey }
    }
    return get().getApiKeyConfig()
  },

  // 图片识别：kimi 支持多模态优先，没有则用当前
  getVisionConfig: (): ApiKeyConfig | null => {
    const kimiKey = getApiKey('moonshot')
    if (kimiKey?.apiKey) {
      const provider = getProvider('moonshot')
      return { providerId: 'moonshot', modelId: provider?.models.some(m => m.id === kimiKey.modelId) ? kimiKey.modelId : (provider?.models[0]?.id || 'kimi-k2.6'), apiKey: kimiKey.apiKey }
    }
    return get().getApiKeyConfig()
  },
}))
