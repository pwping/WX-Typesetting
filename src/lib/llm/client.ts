import type { ApiKeyConfig, ApiProtocol } from '../../types'
import { buildEndpointUrl } from './providers'

const DEFAULT_TIMEOUT_MS = 300 * 1000 // 300 秒网络超时

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

export type ChatContentPart = {
  type: string
  text?: string
  image_url?: { url: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContentPart[]
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  /** 推理/思考内容（thinking mode 下输出） */
  onReasoning?: (token: string) => void
  /** 推理/思考结束，后续为正式内容 */
  onReasoningEnd?: () => void
  onDone: (fullText: string, finishReason?: string) => void
  onError: (error: Error) => void
}

function resolveMaxTokens(modelId: string): number {
  if (/gpt-3\.5|gpt-4-(turbo|0)/i.test(modelId)) return 4096
  if (/deepseek-chat|claude-3[-.](5|haiku|sonnet|opus)/i.test(modelId)) return 8192
  return 16384
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } | { type: 'url'; url: string } }

function toAnthropicContent(content: string | ChatContentPart[]): string | AnthropicContentBlock[] {
  if (typeof content === 'string') return content
  const blocks: AnthropicContentBlock[] = []
  for (const part of content) {
    if (part.type === 'text' && part.text) {
      blocks.push({ type: 'text', text: part.text })
    } else if (part.type === 'image_url' && part.image_url?.url) {
      const url = part.image_url.url
      const dataMatch = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (dataMatch) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: dataMatch[1], data: dataMatch[2] },
        })
      } else {
        blocks.push({
          type: 'image',
          source: { type: 'url', url },
        })
      }
    }
  }
  return blocks
}

function extractTextContent(content: string | ChatContentPart[]): string {
  if (typeof content === 'string') return content
  return content
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\n')
}

function buildRequest(
  config: ApiKeyConfig,
  messages: ChatMessage[],
  stream: boolean,
  options?: { disableThinking?: boolean },
): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const url = buildEndpointUrl(config.baseUrl, config.protocol)
  const maxTokens = resolveMaxTokens(config.modelId)

  if (config.protocol === 'anthropic') {
    const systemParts: string[] = []
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | AnthropicContentBlock[] }> = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        const text = extractTextContent(msg.content)
        if (text) systemParts.push(text)
      } else {
        anthropicMessages.push({
          role: msg.role,
          content: toAnthropicContent(msg.content),
        })
      }
    }

    const body: Record<string, unknown> = {
      model: config.modelId,
      messages: anthropicMessages,
      max_tokens: maxTokens,
      stream,
    }
    if (systemParts.length > 0) {
      body.system = systemParts.join('\n\n')
    }

    return {
      url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    }
  }

  const body: Record<string, unknown> = {
    model: config.modelId,
    messages,
    stream,
    max_tokens: maxTokens,
  }
  // 仅对已知支持 thinking 控制参数的 DeepSeek / Moonshot 官方接口关闭思考模式，避免标准 OpenAI 接口报错
  if (
    stream &&
    options?.disableThinking !== false &&
    /(api\.deepseek\.com|api\.moonshot\.(cn|ai))/i.test(config.baseUrl)
  ) {
    body.thinking = { type: 'disabled' }
  }

  return {
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body,
  }
}

async function parseHttpError(response: Response, config: ApiKeyConfig): Promise<Error> {
  const errText = await response.text().catch(() => '')
  let errMsg = `API 错误 (${response.status})`
  try {
    const errJson = JSON.parse(errText)
    errMsg = errJson.error?.message || errJson.message || errMsg
  } catch {
    if (errText) errMsg += `: ${errText.slice(0, 200)}`
  }

  const label = config.modelId || (config.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI')
  if (/insufficient.?balance|余额不足|quota|credit balance is too low/i.test(errMsg)) {
    return new Error(`余额不足:${label}`)
  }
  if (response.status === 401 || /invalid.*api.?key|incorrect.*api.?key|authentication.*fail/i.test(errMsg)) {
    return new Error(`密钥无效:${label}`)
  }
  return new Error(errMsg)
}

function handleSseData(
  protocol: ApiProtocol,
  data: string,
  state: { fullText: string; finishReason: string },
  callbacks: StreamCallbacks,
): 'done' | 'continue' {
  if (data === '[DONE]') {
    callbacks.onDone(state.fullText, state.finishReason || undefined)
    return 'done'
  }

  let json: Record<string, any>
  try {
    json = JSON.parse(data)
  } catch {
    return 'continue'
  }

  if (protocol === 'anthropic') {
    if (json.type === 'error') {
      callbacks.onError(new Error(json.error?.message || 'Anthropic 流式响应错误'))
      return 'done'
    }
    if (json.type === 'content_block_delta') {
      const delta = json.delta
      if (delta?.type === 'thinking_delta' && delta.thinking) {
        callbacks.onReasoning?.(delta.thinking)
      } else if (delta?.type === 'text_delta' && delta.text) {
        if (state.fullText === '') {
          callbacks.onReasoningEnd?.()
        }
        state.fullText += delta.text
        callbacks.onToken(delta.text)
      }
    } else if (json.type === 'message_delta' && json.delta?.stop_reason) {
      state.finishReason = json.delta.stop_reason === 'max_tokens' ? 'length' : json.delta.stop_reason
    } else if (json.type === 'message_stop') {
      callbacks.onDone(state.fullText, state.finishReason || undefined)
      return 'done'
    }
    return 'continue'
  }

  const choice = json.choices?.[0]
  const delta = choice?.delta
  const content = delta?.content
  const reasoningContent = delta?.reasoning_content ?? delta?.reasoning
  if (choice?.finish_reason) {
    state.finishReason = choice.finish_reason
  }
  if (reasoningContent) {
    callbacks.onReasoning?.(reasoningContent)
  }
  if (content) {
    if (state.fullText === '') {
      callbacks.onReasoningEnd?.()
    }
    state.fullText += content
    callbacks.onToken(content)
  }
  return 'continue'
}

export async function streamChat(
  config: ApiKeyConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  options?: { disableThinking?: boolean },
): Promise<void> {
  const { url, headers, body } = buildRequest(config, messages, true, options)
  if (!url) {
    callbacks.onError(new Error('请先配置有效的 Base URL'))
    return
  }

  let response: Response
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return
    }
    callbacks.onError(new Error(`网络请求失败：${e instanceof Error ? e.message : '未知错误'}`))
    return
  }

  if (!response.ok) {
    callbacks.onError(await parseHttpError(response, config))
    return
  }

  if (!response.body) {
    callbacks.onError(new Error('响应体为空'))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const state = { fullText: '', finishReason: '' }
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data) continue
        if (handleSseData(config.protocol, data, state, callbacks) === 'done') {
          return
        }
      }
    }
    callbacks.onDone(state.fullText, state.finishReason || undefined)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      callbacks.onDone(state.fullText)
      return
    }
    callbacks.onError(e instanceof Error ? e : new Error('流式读取失败'))
  }
}

export async function chat(
  config: ApiKeyConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const { url, headers, body } = buildRequest(config, messages, false)
  if (!url) {
    throw new Error('请先配置有效的 Base URL')
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await parseHttpError(response, config)
  }

  const json = await response.json()
  if (config.protocol === 'anthropic') {
    const blocks = Array.isArray(json.content) ? json.content : []
    return blocks
      .filter((b: { type?: string; text?: string }) => b.type === 'text' && b.text)
      .map((b: { text: string }) => b.text)
      .join('')
  }
  return json.choices?.[0]?.message?.content || ''
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/** 测试连接结果：用于 API 配置弹窗里的「测试连接」反馈 */
export interface ConnectionTestResult {
  ok: boolean
  message: string
  latencyMs: number
}

const TEST_TIMEOUT_MS = 20 * 1000

function describeTestError(err: Error, status: number): string {
  const msg = err.message
  if (msg.startsWith('密钥无效')) {
    return '连接失败：API Key 无效或没有该模型的权限'
  }
  if (msg.startsWith('余额不足')) {
    return '连接失败：Key 有效，但账户余额或额度不足'
  }
  if (status === 404) {
    return `连接失败：接口路径或模型名不存在（404）${msg.includes('API 错误') ? '' : `，${msg}`}`
  }
  if (status === 429) {
    return '连接失败：请求过于频繁或超出配额（429），请稍后重试'
  }
  if (status >= 500) {
    return `连接失败：服务端错误（${status}），可稍后重试`
  }
  return `连接失败：${msg}`
}

/**
 * 轻量连通性测试：发一次最小请求（max_tokens=1、非流式），
 * 只判断「地址通不通、Key 对不对、模型名存不存在」。
 */
export async function testConnection(config: ApiKeyConfig): Promise<ConnectionTestResult> {
  const startedAt = Date.now()

  let request: { url: string; headers: Record<string, string>; body: Record<string, unknown> }
  try {
    request = buildRequest(config, [{ role: 'user', content: 'ping' }], false, { disableThinking: true })
  } catch (e) {
    return { ok: false, message: `配置有误：${e instanceof Error ? e.message : '无法构造请求'}`, latencyMs: 0 }
  }

  const { url, headers, body } = request
  if (!url) {
    return { ok: false, message: '配置有误：请填写有效的 Base URL', latencyMs: 0 }
  }

  // 把生成量压到最小，只验证连通与鉴权
  body.max_tokens = 1
  if (config.protocol !== 'anthropic' && /(api\.deepseek\.com|api\.moonshot\.(cn|ai))/i.test(config.baseUrl)) {
    body.thinking = { type: 'disabled' }
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      timeout: TEST_TIMEOUT_MS,
    })
    const latencyMs = Date.now() - startedAt

    if (!response.ok) {
      const err = await parseHttpError(response, config)
      return { ok: false, message: describeTestError(err, response.status), latencyMs }
    }

    // 读掉响应体，避免连接悬挂
    await response.text().catch(() => '')
    return {
      ok: true,
      message: `连接成功：模型 ${config.modelId} 已响应（${latencyMs} ms）`,
      latencyMs,
    }
  } catch (e) {
    const latencyMs = Date.now() - startedAt
    if (e instanceof Error && e.name === 'TimeoutError') {
      return {
        ok: false,
        message: `连接超时（超过 ${TEST_TIMEOUT_MS / 1000} 秒），请检查 Base URL 与网络`,
        latencyMs,
      }
    }
    const raw = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      message: `网络请求失败：${raw}（常见原因：Base URL 填错、接口不允许浏览器跨域、网络不通）`,
      latencyMs,
    }
  }
}

