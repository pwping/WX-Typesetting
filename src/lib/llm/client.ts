import type { ApiKeyConfig, ModelProvider } from '../../types'
import { getModel, getProvider } from './providers'
const DEFAULT_TIMEOUT_MS = 300 * 1000 // 300 秒网络超时（�?Agnes 等慢模型足够时间�?
async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, signal, ...rest } = init
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('请求超时', 'TimeoutError'))
    }, timeout)
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
    fetch(input, { ...rest, signal: combinedSignal })
      .then((res) => {
        clearTimeout(timeoutId)
        resolve(res)
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        reject(err)
      })
  })
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}
export interface StreamCallbacks {
  onToken: (token: string) => void
  /** 推理/思考内容（thinking mode 下输出） */
  onReasoning?: (token: string) => void
  /** 推理/思考结束，后续为正式内�?*/
  onReasoningEnd?: () => void
  onDone: (fullText: string, finishReason?: string) => void
  onError: (error: Error) => void
}
export async function streamChat(
  provider: ModelProvider,
  config: ApiKeyConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  options?: { disableThinking?: boolean },
): Promise<void> {
  const model = getModel(provider.id, config.modelId)
  const isDeepSeekV4 = config.modelId === 'deepseek-v4-flash' || config.modelId === 'deepseek-v4-pro'
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages,
    stream: true,
    max_tokens: model?.maxTokens ?? 32768,
  }
  // 排版任务不需要思考模式，主动关闭可大幅提�?
  // disableThinking 默认�?true（排版不需要推理链�?
  const modelInfo = getModel(provider.id, config.modelId)
  const canThink = modelInfo?.supportsThinking === true
  const shouldDisable = options?.disableThinking !== false
  if (canThink && shouldDisable) {
    // DeepSeek / Kimi(moonshot) 均支�?OpenAI 标准�?thinking 控制参数
    // Agnes 明确不支持此参数，跳过不传（Agnes 默认无思考模式）
    if (provider.id === 'deepseek' || provider.id === 'moonshot') {
      body.thinking = { type: 'disabled' }
    }
    // Agnes 不传 thinking 参数，模型本身默认无思�?
  }
  let response: Response
  try {
    response = await fetchWithTimeout(provider.apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return
    }
    callbacks.onError(new Error(`网络请求失败�?{e instanceof Error ? e.message : '未知错误'}`))
    return
  }
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    let errMsg = `API 错误 (${response.status})`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.error?.message || errMsg
    } catch {
      if (errText) errMsg += `: ${errText.slice(0, 200)}`
    }
    // 针对余额不足给出友好提示，携带 providerId 让上层显示具体模型
    if (/insufficient.?balance/i.test(errMsg) || /余额不足/i.test(errMsg) || /quota/i.test(errMsg)) {
      const provider = getProvider(config.providerId)
      const providerName = provider?.name || config.providerId
      callbacks.onError(new Error(`余额不足:${providerName}`))
    } else {
      callbacks.onError(new Error(errMsg))
    }
    return
  }
  if (!response.body) {
    callbacks.onError(new Error('响应体为空'))
    return
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''
  let finishReason = ''
  try {
      // debug
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone(fullText, finishReason || undefined)
          return
        }
        try {
          const json = JSON.parse(data)
          const choice = json.choices?.[0]
          const delta = choice?.delta
          const content = delta?.content
          const reasoningContent = delta?.reasoning_content
          if (choice?.finish_reason) {
            finishReason = choice.finish_reason
          }
          // 推理内容（thinking mode 下的思维链）
          if (reasoningContent) {
            callbacks.onReasoning?.(reasoningContent)
          }
          // 正式内容
          if (content) {
            // 首次出现正式内容时通知推理结束
            if (fullText === '') {
              callbacks.onReasoningEnd?.()
            }
            fullText += content
            callbacks.onToken(content)
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    callbacks.onDone(fullText, finishReason || undefined)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      callbacks.onDone(fullText)
      return
    }
    callbacks.onError(e instanceof Error ? e : new Error('流式读取失败'))
  }
}
export async function chat(
  provider: ModelProvider,
  config: ApiKeyConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const model = getModel(provider.id, config.modelId)
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages,
    stream: false,
    max_tokens: model?.maxTokens ?? 32768,
  }
  const response = await fetch(provider.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    if (/insufficient.?balance/i.test(errText) || /余额不足/i.test(errText) || /quota/i.test(errText)) {
      const provider = getProvider(config.providerId)
      throw new Error(`余额不足:${provider?.name || config.providerId}`)
    }
    throw new Error(`API 错误 (${response.status}): ${errText.slice(0, 200)}`)
  }
  const json = await response.json()
  return json.choices?.[0]?.message?.content || ''
}
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

