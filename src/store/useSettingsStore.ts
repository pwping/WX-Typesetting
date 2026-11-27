import { create } from 'zustand'
import type { ApiKeyConfig, ApiProtocol } from '../types'
import {
  getUniversalApiConfig,
  saveUniversalApiConfig,
  deleteUniversalApiConfig,
  saveSecret,
  getSecret,
  deleteSecret,
} from '../lib/storage/crypto'

interface SettingsState {
  protocol: ApiProtocol
  baseUrl: string
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
  saveApiConfig: (config: ApiKeyConfig) => void
  clearApiConfig: () => void
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

function isConfigComplete(config: { baseUrl: string; modelId: string; apiKey: string }): boolean {
  return Boolean(config.baseUrl.trim() && config.modelId.trim() && config.apiKey.trim())
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  protocol: 'openai',
  baseUrl: '',
  modelId: '',
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
    const stored = getUniversalApiConfig()
    if (stored) {
      set({
        protocol: stored.protocol,
        baseUrl: stored.baseUrl,
        modelId: stored.modelId,
        apiKey: stored.apiKey,
        isKeyValid: isConfigComplete(stored),
      })
    } else {
      set({
        protocol: 'openai',
        baseUrl: '',
        modelId: '',
        apiKey: '',
        isKeyValid: false,
      })
    }
  },

  saveApiConfig: (config) => {
    const normalized: ApiKeyConfig = {
      protocol: config.protocol,
      baseUrl: config.baseUrl.trim(),
      modelId: config.modelId.trim(),
      apiKey: config.apiKey.trim(),
    }
    saveUniversalApiConfig(normalized)
    set({
      protocol: normalized.protocol,
      baseUrl: normalized.baseUrl,
      modelId: normalized.modelId,
      apiKey: normalized.apiKey,
      isKeyValid: isConfigComplete(normalized),
      keyVersion: get().keyVersion + 1,
    })
  },

  clearApiConfig: () => {
    deleteUniversalApiConfig()
    set({
      protocol: 'openai',
      baseUrl: '',
      modelId: '',
      apiKey: '',
      isKeyValid: false,
      keyVersion: get().keyVersion + 1,
    })
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
    if (!isConfigComplete(state)) return null
    return {
      protocol: state.protocol,
      baseUrl: state.baseUrl.trim(),
      modelId: state.modelId.trim(),
      apiKey: state.apiKey.trim(),
    }
  },

  getHtmlRenderConfig: (): ApiKeyConfig | null => {
    return get().getApiKeyConfig()
  },

  getVisionConfig: (): ApiKeyConfig | null => {
    return get().getApiKeyConfig()
  },
}))
