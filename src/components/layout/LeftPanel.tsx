import { useEditorStore } from "../../store/useEditorStore"
import { useSettingsStore } from "../../store/useSettingsStore"
import { RichTextEditor } from "../editor/RichTextEditor"
import { htmlToMarkdown } from "../../lib/markdown/turndown"
import { useState, useRef, useEffect } from "react"
import { streamChat } from "../../lib/llm/client"
import { getProvider } from "../../lib/llm/providers"

function countChars(html: string): number {
  return countContentChars(html)
}

function countContentChars(text: string): number {
  return text
    .replace(/<[^>]+>/g, '')   // 去 HTML 标签
    .replace(/&nbsp;/g, ' ')    // 空格占位
    .replace(/&amp;/g, ' ')     // & 符号
    .replace(/&lt;/g, ' ')      // < 符号
    .replace(/&gt;/g, ' ')      // > 符号
    .replace(/\s+/g, '')        // 去空白
    .length
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function LeftPanel() {
  const richTextHtml = useEditorStore((s) => s.richTextHtml)
  const setMarkdown = useEditorStore((s) => s.setMarkdown)
  const setAiGeneratedContent = useEditorStore((s) => s.setAiGeneratedContent)
  const getHtmlRenderConfig = useSettingsStore((s) => s.getHtmlRenderConfig)
  const setLeftPanelOpen = useEditorStore((s) => s.setLeftPanelOpen)
  const setShowApiKeyDialog = useSettingsStore((s) => s.setShowApiKeyDialog)

  const [prompt, setPrompt] = useState(() => localStorage.getItem('gzh_prompt_draft') || "")
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState("")
  const [dotCount, setDotCount] = useState(0)
  const [reasoningText, setReasoningText] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const streamBufferRef = useRef("")
  const streamCountRef = useRef(0)

  // 提示词实时保存
  useEffect(() => {
    localStorage.setItem('gzh_prompt_draft', prompt)
  }, [prompt])

  // 生成中动态循环显示 . → .. → ...
  useEffect(() => {
    if (!generating) {
      setDotCount(0)
      return
    }
    const timer = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 500)
    return () => clearInterval(timer)
  }, [generating])

  const handleConvert = () => {
    if (richTextHtml) {
      const md = htmlToMarkdown(richTextHtml)
      setMarkdown(md)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setGenerating(false)
    setGenProgress("")
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    const config = getHtmlRenderConfig()
    if (!config) {
      setShowApiKeyDialog(true)
      return
    }

    const provider = getProvider(config.providerId)
    if (!provider) return

    setGenerating(true)
    setGenProgress("准备")
    setReasoningText("")
    setAiGeneratedContent("")
    streamBufferRef.current = ""
    streamCountRef.current = 0

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let fullText = ""
      await streamChat(
        provider,
        config,
        [
          {
            role: "system",
            content: `你是一个专业的公众号文章写手。根据用户的提示词，创作最好的公众号文章。
发挥你的全部能力：深度分析、生动案例、数据支撑、引人入胜的表达。

输出要求：使用基础的 HTML 排版——段落用 <p>、小标题用 <h2>/<h3>、重点加粗用 <strong>、引文用 <blockquote>、列表用 <ul>/<ol>。样式内联。直接输出 HTML 正文片段。`,
          },
          { role: "user", content: prompt.trim() },
        ],
        {
          onReasoning: (token) => {
            streamBufferRef.current += token
            setReasoningText(streamBufferRef.current)
            setGenProgress(`思考中`)
          },
          onReasoningEnd: () => {
            streamBufferRef.current = ""
            streamCountRef.current = 0
            setReasoningText("")
            setAiGeneratedContent('<p style="color:#9CA3AF;font-size:10px;">正在生成正文...</p>')
            setAiGeneratedContent('<p style="color:#9CA3AF;font-size:10px;">正在生成正文...</p>')
            setGenProgress("生成正文")
          },
          onToken: (token) => {
            fullText += token
            // 每收到 3 个 token 更新一次编辑器，让用户实时看到内容在填充
            streamBufferRef.current += token
            streamCountRef.current++
            if (streamCountRef.current % 3 === 0) {
              // 提取干净的 HTML 预览
              let preview = streamBufferRef.current.trim()
              const bodyMatch = preview.match(/<body[^>]*>([\s\S]*)<\/body>/i)
              if (bodyMatch) preview = bodyMatch[1].trim()
              preview = preview.replace(/^```[\s\S]*?\n/, "").replace(/\n```\s*$/, "").trim()
              if (preview) {
                setAiGeneratedContent(preview)
              }
            }
            setGenProgress(`生成正文`)
          },
          onDone: (finalText) => {
            let html = finalText.trim()
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
            if (bodyMatch) html = bodyMatch[1].trim()
            html = html.replace(/^```[\s\S]*?\n/, "").replace(/\n```\s*$/, "").trim()

            setAiGeneratedContent(html)
            setGenerating(false)
            setGenProgress("")
          },
          onError: (err) => {
            if (err.message.startsWith('余额不足:')) {
              const providerName = err.message.split(':')[1]
              useSettingsStore.getState().setShowBalanceAlert(true, providerName)
              setGenerating(false)
              setGenProgress("")
            } else if (err.message.startsWith('密钥无效:')) {
              const providerName = err.message.split(':')[1]
              useSettingsStore.getState().setShowBalanceAlert(true, `密钥无效:${providerName}`)
              setGenerating(false)
              setGenProgress("")
            } else {
              setGenProgress(`失败: ${err.message}`)
              setGenerating(false)
            }
          },
        },
        controller.signal,
        { disableThinking: false },
      )
    } catch (e) {
      setGenProgress(e instanceof Error ? e.message : "生成失败")
      setGenerating(false)
    }
  }

  return (
    <div className="flex w-[30%] min-w-[260px] flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-app-border px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
          <span className="h-3.5 w-0.5 rounded-full bg-app-accent" />
          文案内容
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-app-text-tertiary">
            {richTextHtml ? `${countChars(richTextHtml)} 字` : '编辑原文'}
          </span>
          <button
            onClick={() => setLeftPanelOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text"
            title="收起左侧面板"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 4v16M15 5l-7 7 7 7" /></svg>
          </button>
        </div>
        </div>
      <div className="relative flex-1 overflow-hidden">
        <RichTextEditor />
        {/* 推理/思考内容浮动显示 */}
        {reasoningText && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-white/95 px-4 py-3">
            <pre className="m-0 text-[10px] leading-relaxed text-gray-400 font-sans whitespace-pre-wrap" style={{ fontFamily: 'inherit' }}>
              {reasoningText}
            </pre>
          </div>
        )}
      </div>
      <div className="border-t border-app-border px-3 py-1.5">
        <button
          onClick={handleConvert}
          disabled={!richTextHtml}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          转换为 Markdown →
        </button>
      </div>

      <div className="border-t border-dashed border-app-border px-3 py-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (generating) handleStop()
                else handleGenerate()
              }
            }}
            placeholder="输入提示词，让 AI 帮你生成文案…"
            rows={2}
            className={`w-full resize-none rounded-xl border bg-app-surface px-3 py-2.5 pb-9 pr-10 text-xs text-app-text outline-none transition placeholder:text-app-text-tertiary disabled:opacity-40 ${
              generating
                ? 'border-app-accent/50 ring-1 ring-app-accent/20'
                : 'border-app-border focus:border-app-accent focus:ring-1 focus:ring-app-accent/30'
            }`}
          />
          {/* 生成中的脉冲动画光晕 */}
          {generating && (
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-app-accent/30 ring-offset-1 animate-pulse" />
          )}
          {/* 生成中的状态指示条 */}
          {generating && (
            <div className="absolute bottom-1 left-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] text-app-accent">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-app-accent" />
                {genProgress}{'.'.repeat(dotCount)}
              </span>
            </div>
          )}
          <button
            onClick={generating ? handleStop : handleGenerate}
            disabled={!generating && !prompt.trim()}
            className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-all duration-200 hover:shadow-md active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${
              generating
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-app-accent text-white hover:brightness-110'
            }`}
            title={generating ? '停止' : '发送'}
          >
            {generating ? (
              <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 16 16">
                <rect x="3" y="3" width="4" height="10" rx="0.8" />
                <rect x="9" y="3" width="4" height="10" rx="0.8" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
