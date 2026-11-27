import type { ApiProtocol } from '../../types'

export interface ProtocolOption {
  id: ApiProtocol
  label: string
  description: string
  placeholderBaseUrl: string
  placeholderModel: string
}

export const API_PROTOCOLS: ProtocolOption[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: '兼容 DeepSeek / Kimi / GPT 等',
    placeholderBaseUrl: 'https://api.openai.com/v1',
    placeholderModel: '例如：deepseek-chat / kimi-k2.5 / gpt-4o',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: '兼容 Claude 等 Messages 接口',
    placeholderBaseUrl: 'https://api.anthropic.com',
    placeholderModel: '例如：claude-sonnet-4-20250514',
  },
]

export interface ApiPreset {
  label: string
  protocol: ApiProtocol
  baseUrl: string
  modelId: string
}

export const API_PRESETS: ApiPreset[] = [
  {
    label: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    modelId: 'deepseek-chat',
  },
  {
    label: 'Kimi',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelId: 'kimi-k2.5',
  },
  {
    label: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o',
  },
  {
    label: 'Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    modelId: 'claude-sonnet-4-20250514',
  },
]

export const LEGACY_PROVIDER_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  moonshot: 'https://api.moonshot.cn/v1',
}

/**
 * 根据协议类型将用户填写的 baseUrl 规范化为完整请求端点：
 * - 末尾带 `#` 时原样使用（去掉 `#`），方便自定义完整路径
 * - OpenAI：自动补全 `/v1/chat/completions` 或 `/chat/completions`
 * - Anthropic：自动补全 `/v1/messages` 或 `/messages`
 */
export function buildEndpointUrl(baseUrl: string, protocol: ApiProtocol): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('#')) {
    return trimmed.slice(0, -1).replace(/\/+$/, '')
  }

  const normalized = trimmed.replace(/\/+$/, '')
  if (protocol === 'anthropic') {
    if (/\/messages$/i.test(normalized)) return normalized
    if (/\/v\d+$/i.test(normalized)) return `${normalized}/messages`
    return `${normalized}/v1/messages`
  }

  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}
