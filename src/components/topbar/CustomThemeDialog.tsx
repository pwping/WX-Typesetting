import { useState, useRef } from "react"
import { useSettingsStore } from "../../store/useSettingsStore"
import { useThemeStore } from "../../store/useThemeStore"
import { streamChat, estimateTokens } from "../../lib/llm/client"
import { buildCustomThemePrompt } from "../../lib/llm/promptBuilder"
import type { CustomThemeParams } from "../../lib/llm/promptBuilder"
import { getProvider } from "../../lib/llm/providers"
import { saveCustomTheme, themeNameToFileId } from "../../lib/storage/customThemes"
import { loadThemeGeneratorInstructions } from "../../lib/themes/builtin"
import { extractThemePreviewHtml } from "../../lib/markdown/render"
import type { CustomTheme, StreamStatus, ApiKeyConfig } from "../../types"

type Tab = "text" | "image"

export function CustomThemeDialog() {
  const show = useSettingsStore((s) => s.showCustomThemeDialog)
  const setShow = useSettingsStore((s) => s.setShowCustomThemeDialog)
  const setShowApiKeyDialog = useSettingsStore((s) => s.setShowApiKeyDialog)
  const setShowBalanceAlert = useSettingsStore((s) => s.setShowBalanceAlert)
  const addCustomTheme = useThemeStore((s) => s.addCustomTheme)
  const selectTheme = useThemeStore((s) => s.selectTheme)

  const [tab, setTab] = useState<Tab>("text")
  const [prompt, setPrompt] = useState("")
  const [imageName, setImageName] = useState("")
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined)
  const [imgThemeName, setImgThemeName] = useState("")
  const [imgThemeColor, setImgThemeColor] = useState("")
  const [imgThemeScene, setImgThemeScene] = useState("")
  const [imgDescription, setImgDescription] = useState("")
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [progress, setProgress] = useState("")
  const [stepLabel, setStepLabel] = useState("")
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)

  // 预览内容更新时自动滚动到底部
  const handlePreviewLoad = () => {
    const iframe = previewIframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.scrollTo(0, iframe.contentWindow.document.body.scrollHeight)
    }
  }

  if (!show) return null
  const hasAnyKey = !!(useSettingsStore.getState().getHtmlRenderConfig() || useSettingsStore.getState().getVisionConfig())
  const config = useSettingsStore.getState().getHtmlRenderConfig() || useSettingsStore.getState().getVisionConfig()
  const provider = config ? getProvider(config.providerId) : null
  // 图片模式需要图片；文字模式需要描述
  const canGenerate = hasAnyKey && (
    tab === "image" ? !!imageBase64 : prompt.trim().length > 0
  )

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError("图片文件大小不能超过4MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageBase64(reader.result as string)
      setImageName(file.name)
      setError("")
    }
    reader.readAsDataURL(file)
  }

  /** AI 分析描述 → 提取全部主题参数 */


  const handleGenerate = async () => {
    // 智能模型选择：图片识别用 kimi，文字生成用 deepseek
    const renderConfig: ApiKeyConfig | null = tab === 'image'
      ? useSettingsStore.getState().getVisionConfig()
      : useSettingsStore.getState().getHtmlRenderConfig()
    if (!renderConfig) { setShowApiKeyDialog(true); return }
    const provider = getProvider(renderConfig.providerId)
    if (!provider) return

    setStatus("streaming")
    setProgress("加载 Skill 规则...")
    setGeneratedHtml("")
    setError("")
    setStepLabel("")

    let themeGenInstructions = ""
    // 检查模型是否支持图片识别（kimi 优先时自动有 vision 支持）
    const currentModel = provider.models.find(m => m.id === renderConfig.modelId)
    if (tab === 'image' && !currentModel?.supportsVision) {
      setStatus('error')
      setError(`当前模型（${currentModel?.name || '未知模型'}）不支持图片识别，请先配置 Kimi API Key`)
      return
    }
    try {
      themeGenInstructions = await loadThemeGeneratorInstructions()
    } catch {
      setStatus("error")
      setError("无法加载主题生成器规则文件，请刷新页面后重试")
      return
    }

    setProgress("构建提示词...")

    const genParams: CustomThemeParams = tab === "image"
      ? {
          name: imgThemeName || "",
          color: imgThemeColor || "#6366f1",
          scene: imgThemeScene || "",
          description: imgDescription || "",
          referenceImageBase64: imageBase64,
        }
      : {
          name: "",
          color: "",
          scene: "",
          description: prompt.trim() || "自定义主题",
        }

    try {
      const { messages } = await buildCustomThemePrompt(genParams, themeGenInstructions)
      const inputTokens = messages.reduce(
        (sum, m) => sum + estimateTokens(typeof m.content === "string" ? m.content : JSON.stringify(m.content)),
        0,
      )
      setProgress(`发送请求...`)
      setStepLabel("🎨  生成主题")



      const controller = new AbortController()
      abortRef.current = controller

      let fullHtml = ""
      await streamChat(
        provider,
        renderConfig,
        messages as Parameters<typeof streamChat>[2],
        {
          onToken: (token) => {
            fullHtml += token
            setProgress(`生成中... ${fullHtml.length} 字符`)
            setGeneratedHtml(fullHtml)
            // 实时提取模型生成的主题元信息（名称、颜色、场景）
            if (tab === "image") {
              const nm = fullHtml.match(/<!--\s*theme:\s*(.+?)\s*-->/)
              if (nm && nm[1].trim()) setImgThemeName(nm[1].trim())
              const cm = fullHtml.match(/<!--\s*color:\s*(.+?)\s*-->/)
              if (cm && cm[1].trim()) setImgThemeColor(cm[1].trim())
              const sm = fullHtml.match(/<!--\s*scene:\s*(.+?)\s*-->/)
              if (sm && sm[1].trim()) setImgThemeScene(sm[1].trim())
            }
          },
          onDone: (finalHtml) => {
            const clean = finalHtml
              .trim()
              // 去掉微信不支持的 overflow-x:auto/overflow:auto
              .replace(/overflow-x:\s*auto;?/gi, '')
              .replace(/overflow:\s*auto;?/gi, '')
              // 对 overflow-x:scroll 容器，如果缺少 white-space:nowrap 则补充
              .replace(/overflow-x:\s*scroll;?/gi, (match) =>
                match.includes('white-space:nowrap') ? match : match.replace('scroll', 'scroll;white-space:nowrap')
              )
            setGeneratedHtml(clean)
            setStatus("done")
            setProgress(`完成 · ${clean.length} 字符`)
          },
          onError: (err) => {
            if (err.message.startsWith('余额不足:')) {
              const providerName = err.message.split(':')[1]
              setShowBalanceAlert(true, providerName)
            } else if (err.message.startsWith('密钥无效:')) {
              const providerName = err.message.split(':')[1]
              setShowBalanceAlert(true, `密钥无效:${providerName}`)
            }
            setStatus("error")
            setError(err.message)
          },
        },
        controller.signal,
      )
    } catch (e) {
      setStatus("error")
      setError(e instanceof Error ? e.message : "未知错误")
    }
  }

  const handleSave = async () => {
    if (!generatedHtml) return

    // 从 LLM 生成的注释提取主题元信息（<!-- theme: xxx --><!-- color: #xxx -->...）
    const extractComment = (p: RegExp): string => { const m = generatedHtml.match(p); return m ? m[1].trim() : "" }

    let savedName = tab === "image" ? imgThemeName.trim() : extractComment(/<!--\s*theme:\s*(.+?)\s*-->/i)
    let savedColor = tab === "image" ? (imgThemeColor || "#6366f1") : (extractComment(/<!--\s*color:\s*(.+?)\s*-->/i) || "#6366f1")
    let savedScene = tab === "image" ? (imgThemeScene.trim() || "自定义风格") : (extractComment(/<!--\s*scene:\s*(.+?)\s*-->/i) || "自定义风格")
    let savedDesc = tab === "image" ? (imgDescription.trim()) : extractComment(/<!--\s*desc:\s*(.+?)\s*-->/i)

    if (tab === "image") {
      // 图片模式下对缺失值做额外兜底补全
      if (!savedName) savedName = imageName.replace(/\.[^.]+$/, "") || "自定义主题"
      if (!imgThemeColor) savedColor = savedColor || "#6366f1"
      if (!imgThemeScene.trim()) savedScene = savedScene || "自定义风格"
      if (!savedDesc) savedDesc = imageName || ""
    }

    const safeHtml = generatedHtml.replace(/position\s*:\s*(fixed|absolute|sticky)\s*;?/gi, "")
    const savedTheme = await saveCustomTheme({
      name: savedName || `自定义主题_${Date.now().toString(36).slice(-4)}`,
      color: savedColor,
      scene: savedScene,
      underlineCss: `border-bottom:2px solid ${savedColor};font-weight:600;`,
      componentFile: "",
      componentLibrary: safeHtml,
      description: savedDesc || "",
    })
    addCustomTheme(savedTheme)
    selectTheme(savedTheme.id)
    useSettingsStore.getState().setShowCustomThemeDialog(false)
    resetForm()
  }

  const handleClose = () => {
    setShow(false)
    resetForm()
  }

  const resetForm = () => {
    setTab("text")
    setPrompt("")
    setImageBase64(undefined)
    setImageName("")
    setImgThemeName("")
    setImgThemeColor("")
    setImgThemeScene("")
    setImgDescription("")
    setGeneratedHtml("")
    setStatus("idle")
    setProgress("")
    setStepLabel("")
    setError("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-[680px] max-h-[90vh] flex flex-col rounded-2xl border border-app-border bg-app-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-app-text">自定义主题</h2>
            <p className="text-[10px] text-app-text-tertiary mt-0.5">通过文字描述或参考图创建专属排版主题</p>
          </div>
          <button onClick={handleClose} className="cursor-pointer rounded-lg p-1.5 text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="mx-6 mt-4 flex rounded-lg bg-app-hover p-0.5">
          <button
            onClick={() => setTab("text")}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition ${
              tab === "text"
                ? "bg-app-surface text-app-text shadow-sm"
                : "text-app-text-tertiary hover:text-app-text-secondary"
            }`}
          >
            📝 文字描述
          </button>
          <button
            onClick={() => setTab("image")}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition ${
              tab === "image"
                ? "bg-app-surface text-app-text shadow-sm"
                : "text-app-text-tertiary hover:text-app-text-secondary"
            }`}
          >
            🖼️ 参考图
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!config ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="rounded-xl bg-app-accent-light px-5 py-3">
                <p className="text-sm font-medium text-app-accent-text">请先配置模型 API Key</p>
                <p className="mt-0.5 text-[11px] text-app-accent-text">配置后即可生成自定义主题</p>
              </div>
              <button
                onClick={() => { setShow(false); setShowApiKeyDialog(true) }}
                className="cursor-pointer rounded-lg bg-app-accent px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                前往配置 API
              </button>
            </div>
          ) : tab === "image" ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-app-accent-light px-3 py-2">
                <p className="text-[11px] text-app-accent-text">📷 上传一张参考图，模型会自动分析配色、风格、场景等信息，生成完整主题</p>
              </div>

              <div>
                {imageBase64 ? (
                  <div className="space-y-3">
                    <img src={imageBase64} alt="参考图" className="w-full max-h-[300px] rounded-lg border border-app-border object-contain bg-app-hover" />
                    <button onClick={() => { setImageBase64(undefined); setImageName("") }} className="cursor-pointer rounded-lg border border-app-border px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-50">
                      移除图片
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-app-border py-16 transition hover:border-app-accent hover:bg-app-hover">
                    <svg className="h-12 w-12 text-app-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-sm text-app-text-tertiary">点击上传参考图</span>
                    <span className="text-[10px] text-app-text-tertiary">支持 JPG、PNG，最大 4MB</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-500">{error}</p>
              )}

              {generatedHtml && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">生成预览</label>
                  <iframe ref={previewIframeRef} srcDoc={extractThemePreviewHtml(generatedHtml)} className="h-[300px] w-full rounded-lg border border-app-border bg-white" title="主题预览" onLoad={handlePreviewLoad} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
                  描述你想要的排版风格，AI 会自动分析并生成完整主题
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder="例如：按「黑白杂志、克莱因蓝点睛、衬线字体」的气质，给公众号排版生成一套新主题"
                  className="w-full resize-none rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none transition focus:border-app-accent"
                />
                <p className="mt-1.5 text-[10px] text-app-text-tertiary">
                  描述越详细，生成的主题越贴合你的需求
                </p>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-500">{error}</p>
              )}

              {generatedHtml && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">生成预览</label>
                  <iframe ref={previewIframeRef} srcDoc={extractThemePreviewHtml(generatedHtml)} className="h-[300px] w-full rounded-lg border border-app-border bg-white" title="主题预览" onLoad={handlePreviewLoad} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-app-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status === "streaming" && (
                <>
                  {/* 步骤点 - 随着进度变化 */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: "解析中", icon: "📋" },
                      { key: stepLabel.includes("分析图片") ? "🎨分析图片" : "🎨", icon: stepLabel.includes("分析图片") ? "🖼️" : "🎨" },
                      { key: "完成", icon: "✅" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${
                          (stepLabel === "准备中" && i === 0) || (stepLabel.includes("分析图片") && i === 1) || (stepLabel.includes("生成主题") && (i === 1 || i === 2))
                            ? 'scale-110 opacity-100'
                            : i === 0 ? 'opacity-100' : 'opacity-30'
                        } ${stepLabel.includes("生成主题") && i === 1 ? 'bg-app-accent text-white' : ''}`}>
                          {i === 0 ? "1" : i === 1 ? "2" : "3"}
                        </span>
                        {(stepLabel === "准备中" && i === 0) || (stepLabel.includes("分析图片") && i === 1) || (stepLabel.includes("生成主题") && (i === 1 || i === 2)) ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-app-text">
                            <span className="animate-spin text-[8px]">⚡</span>
                            {s.key}
                          </span>
                        ) : i < 2 ? (
                          <span className="text-[10px] text-app-text-tertiary">{s.key}</span>
                        ) : null}
                        {i < 2 && <span className="mx-1 text-app-text-tertiary text-[8px]">→</span>}
                      </div>
                    ))}
                  </div>
                  {/* 进度条 */}
                  <div className="w-20 h-1 rounded-full bg-app-border overflow-hidden">
                    <div className={`h-full rounded-full bg-app-accent transition-all duration-700 ${
                      stepLabel === "准备中" ? "w-1/4" : stepLabel.includes("分析图片") ? "w-1/2" : "w-3/4"
                    }`} />
                  </div>
                  <span className="text-[10px] text-app-text-tertiary">{progress}</span>
                </>
              )}
              {status === "done" && (
                <span className="flex items-center gap-1.5 text-xs text-app-accent">
                  <span>✅</span> 生成完成
                </span>
              )}
              {status === "error" && <span className="text-[11px] text-red-500">⚠️ {progress || error}</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              {status === "done" ? (
                <button onClick={handleSave} className="cursor-pointer rounded-lg bg-app-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                  保存为自定义主题
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || status === "streaming"}
                  className="cursor-pointer rounded-lg bg-app-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {status === "streaming" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                      <span>进行中</span>
                    </span>
                  ) : "生成主题"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
