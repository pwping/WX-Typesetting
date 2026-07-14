import { useEditorStore } from "../../store/useEditorStore"
import { useSettingsStore } from "../../store/useSettingsStore"
import { useThemeStore } from "../../store/useThemeStore"
import { loadThemeComponentLibrary, loadCommonComponents, loadSkillInstructions } from "../../lib/themes/builtin"
import { streamChat } from "../../lib/llm/client"
import { buildTypesetPrompt } from "../../lib/llm/promptBuilder"
import { getProvider } from "../../lib/llm/providers"
import { validateHtml } from "../../lib/validation/htmlValidator"
import { useHistoryStore } from "../../store/useHistoryStore"
import { useEffect, useRef, useState, useCallback } from "react"

export function MiddlePanel() {
  const markdown = useEditorStore((s) => s.markdown)
  const setMarkdown = useEditorStore((s) => s.setMarkdown)
  const setGeneratedHtml = useEditorStore((s) => s.setGeneratedHtml)
  const setStreamStatus = useEditorStore((s) => s.setStreamStatus)
  const setValidationResult = useEditorStore((s) => s.setValidationResult)
  const streamStatus = useEditorStore((s) => s.streamStatus)
  const streamProgress = useEditorStore((s) => s.streamProgress)
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen)

  const selectedThemeId = useThemeStore((s) => s.selectedThemeId)
  const getAllThemes = useThemeStore((s) => s.getAllThemes)
  const getHtmlRenderConfig = useSettingsStore((s) => s.getHtmlRenderConfig)
  const [dotCount, setDotCount] = useState(0)
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const markdownHistory = useRef<string[]>([markdown])
  const historyIdx = useRef(0)
  const isUndoingRef = useRef(false)

    // \u64a4\u9500\u5386\u53f2
  const prevMarkdown = useRef(markdown)
  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      prevMarkdown.current = markdown
      return
    }
    if (markdown !== prevMarkdown.current) {
      const hist = markdownHistory.current
      const idx = historyIdx.current
      if (idx < hist.length - 1) {
        hist.length = idx + 1
      }
      hist.push(markdown)
      if (hist.length > 50) hist.shift()
      historyIdx.current = hist.length - 1
      prevMarkdown.current = markdown
    }
  }, [markdown])

  const handleUndo = () => {
    const idx = historyIdx.current
    if (idx <= 0) return
    historyIdx.current = idx - 1
    isUndoingRef.current = true
    setMarkdown(markdownHistory.current[idx - 1])
  }

  // 渲染中动画点点
  useEffect(() => {
    if (streamStatus !== "streaming") { setDotCount(0); return }
    const timer = setInterval(() => setDotCount((n) => (n + 1) % 4), 500)
    return () => clearInterval(timer)
  }, [streamStatus])

  const handleRedo = () => {
    const hist = markdownHistory.current
    const idx = historyIdx.current
    if (idx >= hist.length - 1) return
    historyIdx.current = idx + 1
    isUndoingRef.current = true
    setMarkdown(hist[idx + 1])
  }

const handleTypeset = async () => {
    try {
      if (!markdown.trim()) return

      const config = getHtmlRenderConfig()
      if (!config) {
        useSettingsStore.getState().setShowApiKeyDialog(true)
        return
      }

      const provider = getProvider(config.providerId)
      if (!provider) return

      const allThemes = getAllThemes()
      if (!Array.isArray(allThemes) || allThemes.length === 0) {
        setStreamStatus("error", "主题列表为空，请刷新页面后重试")
        return
      }

      const theme = allThemes.find((t) => t && t.id === selectedThemeId)
      if (!theme || typeof theme.name !== "string") {
        setStreamStatus("error", `未找到选中主题 (id: ${selectedThemeId})，请刷新后重试`)
        return
      }

      setStreamStatus("streaming", "加载主题组件库...")
      setValidationResult(null)
      setGeneratedHtml("")

      let themeLib: string
      if (!theme.isBuiltin && "componentLibrary" in theme && theme.componentLibrary) {
        themeLib = theme.componentLibrary
      } else {
        themeLib = await loadThemeComponentLibrary(theme.componentFile)
      }

      const [commonLib, skillCore] = await Promise.all([
        loadCommonComponents(),
        loadSkillInstructions(),
      ])

      setStreamStatus("streaming", "构建提示词...")

      // 详细诊断 theme 对象
      console.log("[DIY] theme:", JSON.stringify({ id: theme.id, name: theme.name, type: typeof theme, nameType: typeof theme.name }))
      if (typeof theme.name !== "string") {
        throw new Error(`theme.name 异常: type=${typeof theme.name}, value=${JSON.stringify(theme.name)}`)
      }

      const { messages } = await buildTypesetPrompt(
        markdown,
        theme,
        themeLib,
        commonLib,
        skillCore,
      )

      setStreamStatus("streaming", "渲染中，点击可中断渲染")

      const controller = new AbortController()
      abortRef.current = controller

      let fullHtml = ""
      await streamChat(
        provider,
        config,
        messages as Parameters<typeof streamChat>[2],
        {
          onToken: (token) => {
            fullHtml += token
            setStreamStatus("streaming", "渲染中，点击可中断渲染")
            setGeneratedHtml(fullHtml)
          },
          onDone: (finalHtml, finishReason) => {
            const cleanHtml = ensureTrailingLineBreak(ensureSpanLeaf(removeUnsupportedWechatCss(fixHalfWidthPunctuation(replaceDatePlaceholders(extractHtml(replaceDivWithSection(finalHtml)))))))
            setGeneratedHtml(cleanHtml)

            const result = validateHtml(cleanHtml)
            setValidationResult(result)

            // 自动保存到排版历史
            if (result.passed) {
              useHistoryStore.getState().addRecord({
                title: markdown.split('\n').find(l => l.trim().startsWith('# '))?.replace(/# /, '').trim() || markdown.slice(0, 40).trim() || '无标题',
                html: cleanHtml,
                themeId: selectedThemeId,
                themeName: theme.name,
                themeColor: theme.color,
              })
            }

            if (finishReason === "length") {
              setStreamStatus(
                "error",
                "内容被模型截断（达到 max_tokens 上限）。建议：1) 缩短文章；2) 换用输出上限更高的模型；3) 分段排版",
              )
            } else if (result.errors.length > 0) {
              setStreamStatus("error", `校验失败: ${result.errors[0].message}`)
            } else {
              setStreamStatus("done", `完成 · ${result.spanLeafCount} span leaf · ${result.errors.length} ERROR · ${result.warnings.length} WARNING`)
            }
          },
          onError: (err) => {
            if (err.message.startsWith('余额不足:')) {
              const providerName = err.message.split(':')[1]
              useSettingsStore.getState().setShowBalanceAlert(true, providerName)
            }
            setStreamStatus("error", err.message)
          },
        },
        controller.signal,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStreamStatus("error", `排版失败: ${msg}`)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setStreamStatus("idle", "")
  }

  const insertMarkdown = useCallback((syntax: string, sampleText: string) => {
    const ta = mdTextareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = markdown
    const before = text.substring(0, start)
    const after = text.substring(end)
    const selected = text.substring(start, end)
    const insert = selected || sampleText
    let newText = text
    let cursorPos = start

    switch (syntax) {
      case "#": newText = before + "# " + insert + "\n\n" + after; cursorPos = start + 2; break
      case "##": newText = before + "## " + insert + "\n\n" + after; cursorPos = start + 3; break
      case "###": newText = before + "### " + insert + "\n\n" + after; cursorPos = start + 4; break
      case "**": newText = before + "**" + insert + "**" + after; cursorPos = start + 2 + insert.length + 2; break
      case "*": newText = before + "*" + insert + "*" + after; cursorPos = start + 1 + insert.length + 1; break
      case "==": newText = before + "==" + insert + "==" + after; cursorPos = start + 2 + insert.length + 2; break
      case "<u>": newText = before + "<u>" + insert + "</u>" + after; cursorPos = start + 3 + insert.length + 4; break
      case ">": newText = before + "> " + insert.replace("\n", "\n> ") + "\n\n" + after; cursorPos = start + 2; break
      case "-": newText = before + "- " + insert.replace("\n", "\n- ") + "\n\n" + after; cursorPos = start + 2; break
      case "1.": newText = before + "1. " + insert.replace("\n", "\n1. ") + "\n\n" + after; cursorPos = start + 3; break
      case "LINK": newText = before + "[" + insert + "](url)" + after; cursorPos = start + 1 + insert.length + 6; break
      case "IMG": newText = before + "![" + insert + "](url)" + after; cursorPos = start + 2 + insert.length + 6; break
      case "</>":
        const code = insert || "code"
        newText = before + "```\n" + code + "\n```\n\n" + after
        cursorPos = start + 4
        break
      case "---": newText = before + "\n---\n\n" + after; cursorPos = start + 5; break
      case "~~": newText = before + "~~" + insert + "~~" + after; cursorPos = start + 2 + insert.length + 2; break
      case "`": newText = before + "`" + insert + "`" + after; cursorPos = start + 1 + insert.length + 1; break
      case "[]": newText = before + "- [ ] " + insert + "\n" + after; cursorPos = start + 6; break
      case "<small>": newText = before + "<small>" + insert + "</small>" + after; cursorPos = start + 7 + insert.length + 8; break
    }
    const savedScroll = ta.scrollTop
    setMarkdown(newText)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursorPos, cursorPos); ta.scrollTop = savedScroll }, 0)
  }, [markdown, setMarkdown])

  return (
    <div className={`flex ${leftPanelOpen ? "w-[40%]" : "flex-1"} min-w-[300px] flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm`}>
      <div className="flex items-center justify-between border-b border-app-border px-4 py-2.5">
        <span className="text-xs font-semibold text-app-text">Markdown 编辑器</span>
        <div className="flex items-center gap-2">
        </div>
      </div>
      {/* Markdown 快捷工具栏 */}
      <div className="border-b border-app-border px-3 py-1.5 space-y-1.5">
        <div className="flex gap-1">
          <button onClick={() => insertMarkdown("#", "标题")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="H1 标题"># 标题</button>
          <button onClick={() => insertMarkdown("##", "章节")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="H2 章节">## 章节</button>
          <button onClick={() => insertMarkdown("###", "小标题")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="H3 小标题">### 小标题</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => insertMarkdown("**", "加粗文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="加粗">B 加粗</button>
          <button onClick={() => insertMarkdown("*", "斜体文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold italic text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="斜体">I 斜体</button>
          <button onClick={() => insertMarkdown("==", "高亮文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="高亮">== 高亮</button>
          <button onClick={() => insertMarkdown("<u>", "下划线文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="下划线"><u>U</u> 下划线</button>
          <button onClick={() => insertMarkdown("LINK", "链接文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="链接">LINK 链接</button>
          <button onClick={() => insertMarkdown("~~", "删除线文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="删除线">~~ 删除线</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => insertMarkdown(">", "引用内容")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="引用内容">&gt; 引用内容</button>
          <button onClick={() => insertMarkdown("-", "列表项")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="无序列表">- 无序列表</button>
          <button onClick={() => insertMarkdown("1.", "列表项")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="有序列表">1. 有序列表</button>
          <button onClick={() => insertMarkdown("[]", "任务内容")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="任务列表">[ ] 任务列表</button>
          <button onClick={() => insertMarkdown("<small>", "注释文字")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="小字注释">注 小字</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => insertMarkdown("\x60", "代码")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="行内代码">` 行内代码</button>
          <button onClick={() => insertMarkdown("IMG", "图片说明")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="图片">IMG 图片</button>
          <button onClick={() => insertMarkdown("</>", "代码示例")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="代码块">&lt;/&gt; 代码</button>
          <button onClick={() => insertMarkdown("---", "")} className="cursor-pointer rounded-md border border-app-border px-3 py-1 text-[11px] font-bold text-app-text-secondary transition hover:bg-app-hover hover:text-app-accent" title="分割线">--- 分割线</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <textarea
          ref={mdTextareaRef}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
              e.preventDefault()
              handleUndo()
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
              e.preventDefault()
              handleRedo()
            }
          }}
          className="md-editor"
          placeholder="在这里输入或粘贴 Markdown 文章..."
          spellCheck={false}
        />
      </div>

      <div className="border-t border-app-border px-3 py-2.5">
        {streamStatus === "streaming" ? (
          <button
            onClick={handleStop}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            渲染中，点击可中断渲染{'.'.repeat(dotCount)}
          </button>
        ) : (
          <button
            onClick={handleTypeset}
            disabled={!markdown.trim() || streamStatus === "streaming"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            排版渲染 →
          </button>
        )}
        {streamStatus === "error" && (
          <p className="mt-1.5 text-[10px] text-red-500">{streamProgress}</p>
        )}
      </div>
    </div>
  )
}

function extractHtml(text: string): string {
  let cleaned = text.trim()
  if (!cleaned) return ''

  const firstFence = cleaned.indexOf("```")
  const lastFence = cleaned.lastIndexOf("```")

  if (firstFence !== -1) {
    if (firstFence === lastFence) {
      cleaned = cleaned.substring(lastFence + 3).trim()
    } else {
      cleaned = cleaned.substring(firstFence + 3, lastFence).trim()
    }
    cleaned = cleaned.replace(/^[a-zA-Z#]+\n?/, '').trim()
  }

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) return bodyMatch[1].trim()

  const firstSection = cleaned.indexOf('<section')
  const lastSectionEnd = cleaned.lastIndexOf('</section>')
  if (firstSection !== -1 && lastSectionEnd !== -1) {
    return cleaned.substring(firstSection, lastSectionEnd + '</section>'.length)
  }

  if (/<[\w]+[^>]*>/.test(cleaned)) {
    return cleaned
  }

  return cleaned
}

function replaceDatePlaceholders(html: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const today = `${year}年${month}月${day}日`
  const todayShort = `${year}/${month}/${day}`

  return html
    .replace(/\{\{日期\}\}/g, today)
    .replace(/\{\{日期短\}\}/g, todayShort)
    .replace(/\{\{年份\}\}/g, String(year))
    .replace(/\{\{月份\}\}/g, `${year}年${month}月`)
    .replace(/\{\{DATE\}\}/g, today)
    .replace(/\{\{month\}\}/g, `${year}年${month}月`)

}

function replaceDivWithSection(html: string): string {
  return html
    .replace(/<div(\s[^>]*)?>/gi, (match, attrs) => attrs ? `<section${attrs}>` : '<section>')
    .replace(/<\/div>/gi, '</section>')
}

/** 去除微信不支持的 CSS 属性，防止布局在微信编辑器中崩溃 */
function removeUnsupportedWechatCss(html: string): string {
  return html
    .replace(/position\s*:\s*(fixed|absolute|sticky)\s*;?/gi, '')
    .replace(/float\s*:\s*(left|right|none|inline-start|inline-end)\s*;?/gi, '')
    .replace(/overflow-x:\s*auto;?/gi, '')
    .replace(/overflow-y:\s*auto;?/gi, '')
    .replace(/\s*overflow:\s*auto\s*;?/gi, ' ')
    // 对 overflow-x:scroll 容器，如果缺少 white-space:nowrap 则补充
    .replace(/overflow-x:\s*scroll;?/gi, (match) =>
      match.includes('white-space:nowrap') ? match : match.replace('scroll', 'scroll;white-space:nowrap')
    )
}

/** 修正正文中的半角标点为全角（仅处理文本节点，不碰 HTML 属性） */
function fixHalfWidthPunctuation(html: string): string {
  // 只替换标签之间的文本内容，不碰 style="..." 等 HTML 属性
  let result = ""
  let inTag = false
  let inCode = false
  let buffer = ""

  for (let i = 0; i < html.length; i++) {
    const ch = html[i]

    if (ch === "<") {
      // 遇到标签开始，先处理之前缓存的文本
      if (buffer && !inCode) {
        result += fixTextPunctuation(buffer)
      } else {
        result += buffer
      }
      buffer = ""
      inTag = true
      result += ch
      continue
    }

    if (ch === ">") {
      result += ch
      inTag = false
      // 检测代码块开始/结束
      if (result.endsWith('<code>') || result.endsWith('<pre>') || result.endsWith('<span style="font-family:monospace') || result.endsWith('</code>') || result.endsWith('</pre>')) {
        inCode = !inCode
      }
      continue
    }

    if (inTag) {
      result += ch
    } else {
      buffer += ch
    }
  }

  // 处理最后的缓冲区
  if (buffer) {
    result += (inCode ? buffer : fixTextPunctuation(buffer))
  }

  return result
}

function fixTextPunctuation(text: string): string {
  // 转换英文直引号为中文全角弯引号
  // 规则：交替使用 ""，奇数个用 "，偶数个用 "
  // 先处理连续三点 → 省略号
  text = text.replace(/\.\.\./g, "\u2026")
  let result = ""
  let quoteCount = 0
  for (const ch of text) {
    if (ch === '"') {
      quoteCount++
      result += quoteCount % 2 === 1 ? "\u201C" : "\u201D"
    } else if (ch === "'") {
      result += "\u2018"
    } else if (ch === "," && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF0C"
    } else if (ch === "?" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF1F"
    } else if (ch === "!" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF01"
    } else if (ch === ":" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF1A"
    } else if (ch === ";" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF1B"
    } else if (ch === "(" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF08"
    } else if (ch === ")" && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result.slice(-1))) {
      result += "\uFF09"
    } else {
      result += ch
    }
  }
  return result
}

/** 确保输出末尾有空行（</section> 前至少有一个 <br>） */

function ensureSpanLeaf(html) {
  try {
    var doc = new DOMParser().parseFromString(html, "text/html")
    var walk = document.createTreeWalker(doc.body, 4)
    var nodes = []
    while (walk.nextNode()) nodes.push(walk.currentNode)
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i]
      var txt = (n.textContent || "").trim()
      if (!txt || !n.parentElement) continue
      if (n.parentElement.tagName === "SPAN" && n.parentElement.hasAttribute("leaf")) continue
      var s = doc.createElement("span")
      s.setAttribute("leaf", "")
      s.textContent = n.textContent
      n.parentElement.replaceChild(s, n)
    }
    return doc.body.innerHTML
  } catch (e) { return html }
}
function ensureTrailingLineBreak(html: string): string {
  // 在 </section> 之前插入 <br>，确保复制到公众号后可继续输入内容
  // 只插一个，避免多渲染时重复叠加
  return html.replace(/(<br\s*\/?>\s*)*<\/section>\s*$/i, '<br></section>')
}
