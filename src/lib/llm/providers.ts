import type { ModelProvider, ModelOption } from '../../types'

export const PROVIDERS: ModelProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiBase: 'https://api.deepseek.com/v1/chat/completions',
    supportsVision: false,
    imageFormat: 'image_url',
    models: [
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        maxTokens: 32768,
        supportsVision: false,
        supportsThinking: true,
        costPer1kInput: 0.0011,
        costPer1kOutput: 0.0021,
      },
      {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        maxTokens: 32768,
        supportsVision: false,
        supportsThinking: true,
        costPer1kInput: 0.004,
        costPer1kOutput: 0.016,
      },
    ],
  },
  {
    id: 'moonshot',
    name: 'Kimi',
    apiBase: 'https://api.moonshot.cn/v1/chat/completions',
    supportsVision: true,
    imageFormat: 'image_url',
    models: [
      {
        id: 'kimi-k2.6',
        name: 'Kimi K2.6',
        maxTokens: 32768,
        supportsVision: true,
        supportsThinking: true,
        costPer1kInput: 0.008,
        costPer1kOutput: 0.032,
      },
    ],
  },
]

export function getProvider(providerId: string): ModelProvider | undefined {
  return PROVIDERS.find((p) => p.id === providerId)
}

export function getModel(providerId: string, modelId: string): ModelOption | undefined {
  const provider = getProvider(providerId)
  return provider?.models.find((m) => m.id === modelId)
}
