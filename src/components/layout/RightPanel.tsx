import { useRef, useEffect, useState } from "react"
import { useEditorStore } from "../../store/useEditorStore"
import { useThemeStore } from "../../store/useThemeStore"
import { copyHtmlToClipboard, downloadHtml } from "../../lib/clipboard/copyHtml"
import type { ValidationResult, StreamStatus } from "../../types"
import { domToPng, domToCanvas } from "modern-screenshot"

export function RightPanel() {
  const generatedHtml = useEditorStore((s) => s.generatedHtml)
  const streamStatus = useEditorStore((s) => s.streamStatus)
  const streamProgress = useEditorStore((s) => s.streamProgress)
  const validationResult = useEditorStore((s) => s.validationResult)
  const selectedThemeId = useThemeStore((s) => s.selectedThemeId)
  const getAllThemes = useThemeStore((s) => s.getAllThemes)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [capturing, setCapturing] = useState(false)
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false)

  const allThemes = getAllThemes()
  const theme = Array.isArray(allThemes) ? allThemes.find((t) => t && t.id === selectedThemeId) : undefined
  const isLoading = streamStatus === "streaming" && !generatedHtml

  useEffect(() => {
    if (iframeRef.current && generatedHtml) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write("<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body{margin:0;padding:10px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;}.gzh-wrapper{max-width:677px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);}</style></head><body><div class=\"gzh-wrapper\">" + generatedHtml + "</div></body></html>")
        doc.close()
        requestAnimationFrame(() => {
          try {
            const win = iframeRef.current?.contentWindow
            if (win) {
              win.scrollTo(0, win.document.body.scrollHeight)
            }
          } catch {
            // 跨域安全限制时忽略
          }
        })
      }
    }
  }, [generatedHtml])

  const handleCopy = async () => {
    const ok = await copyHtmlToClipboard(generatedHtml)
    setCopied(ok)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  // 创建宽度为渲染HTML原始宽度的容器并等待资源加载
  const createContainer = async (width: number) => {
    const container = document.createElement("div")
    container.style.cssText =
      `position:fixed;left:-99999px;top:0;width:${width}px;background:#fff;z-index:-1;`
    container.innerHTML = generatedHtml
    document.body.appendChild(container)
    const imgs = Array.from(container.querySelectorAll("img")) as HTMLImageElement[]
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalHeight !== 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve(); img.onerror = () => resolve()
            })
      )
    )
    if (document.fonts?.ready) await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    return container
  }

  const handleScreenshot = async () => {
    setShowScreenshotDialog(false)
    if (!generatedHtml) return
    setCapturing(true)
    const container = await createContainer(677)
    try {
      const dataUrl = await domToPng(container, {
        scale: 2, backgroundColor: "#ffffff",
        width: 677, height: container.scrollHeight,
        style: { margin: "0", padding: "0" },
      })
      const link = document.createElement("a")
      link.download = `排版截图_${theme?.name || "article"}.png`
      link.href = dataUrl
      link.click()
    } catch (err) { console.error("截图失败:", err) }
    finally { document.body.removeChild(container); setCapturing(false) }
  }

  const handleSliceScreenshot = async () => {
    setShowScreenshotDialog(false)
    if (!generatedHtml) return
    setCapturing(true)
    const W = 677
    const H = Math.round(677 * 1.33) // ≈ 900
    const container = await createContainer(W)
    try {
      const canvas = await domToCanvas(container, {
        scale: 2, backgroundColor: "#ffffff",
        width: W, height: container.scrollHeight,
        style: { margin: "0", padding: "0" },
      })
      const W_RAW = W * 2
      const H_RAW = H * 2
      const totalH = canvas.height
      const baseName = `截图_${theme?.name || "article"}`
      let part = 1
      for (let top = 0; top < totalH; top += H_RAW, part++) {
        const c = document.createElement("canvas")
        c.width = W
        c.height = H
        const ctx = c.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, W, H)
        // 从 2x 源采样缩放到逻辑尺寸，保持清晰度
        ctx.drawImage(canvas, 0, top, W_RAW, H_RAW, 0, 0, W, H)
        const link = document.createElement("a")
        link.download = `${baseName}_${part}.png`
        link.href = c.toDataURL("image/png")
        link.click()
      }
    } catch (err) { console.error("截贴图失败:", err) }
    finally { document.body.removeChild(container); setCapturing(false) }
  }

  return (
    <div className="relative flex w-[30%] min-w-[260px] flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-app-border bg-app-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-app-text">预览</span>
          {theme && (
            <span className="flex items-center gap-1.5 rounded-md bg-app-accent-light px-2 py-0.5 text-xs font-bold text-app-accent-text">
              <span className="h-2 w-2 rounded-full" style={{ background: theme.color }} />
              {theme.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!generatedHtml || !validationResult?.passed}
            className="cursor-pointer rounded-lg bg-app-accent px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {copied ? "已复制!" : "复制到公众号"}
          </button>
          <button
            onClick={() => downloadHtml(generatedHtml, "article.html")}
            disabled={!generatedHtml}
            className="cursor-pointer rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-[11px] font-medium text-app-text-secondary transition hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
          >
            导出
          </button>
          <button
            onClick={() => setShowScreenshotDialog(true)}
            disabled={!generatedHtml || capturing}
            className="cursor-pointer rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-[11px] font-medium text-app-text-secondary transition hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
          >
            {capturing ? "截图中..." : "截图"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-app-text-tertiary">
            <div className="flex h-16 w-16 items-center justify-center">
              <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-app-accent" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-semibold text-app-text-secondary">HTML 渲染中</p>
              <p className="text-[10px]">{streamProgress || "加载主题组件库..."}</p>
            </div>
            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-app-accent/60" style={{ animationDelay: "0s" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-app-accent/60" style={{ animationDelay: "0.15s" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-app-accent/60" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        ) : generatedHtml ? (
          <iframe
            ref={iframeRef}
            className="h-full min-h-[500px] w-full rounded-lg border border-app-border bg-white"
            title="排版预览"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-app-text-tertiary">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-app-hover">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
              </svg>
            </div>
            <p className="text-xs">在中间面板点击「排版渲染」</p>
            <p className="text-[10px]">排版结果将在此预览</p>
          </div>
        )}
      </div>

      <ValidationFooter
        result={validationResult || { passed: false, errors: [], warnings: [], spanLeafCount: 0 }}
        status={streamStatus}
        progress={streamProgress}
      />

      {showScreenshotDialog && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowScreenshotDialog(false)}
        >
          <div
            className="w-72 overflow-hidden rounded-2xl bg-app-surface shadow-2xl ring-1 ring-app-border"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "dialogIn 0.18s ease-out" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-app-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-app-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span className="text-sm font-semibold text-app-text">选择截图方式</span>
              </div>
              <button
                onClick={() => setShowScreenshotDialog(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="p-2.5">
              {/* 截长图 */}
              <button
                onClick={handleScreenshot}
                className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-app-hover"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-light text-app-accent transition group-hover:scale-105">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </span>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-app-text">截长图</span>
                    <span className="rounded bg-app-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-app-accent">完整</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-app-text-tertiary">截取整篇文章为 1 张完整长图</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-app-text-tertiary opacity-0 transition group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <div className="my-1 h-px bg-app-border/60" />

              {/* 截贴图 */}
              <button
                onClick={handleSliceScreenshot}
                className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-app-hover"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition group-hover:scale-105 dark:bg-amber-900/30 dark:text-amber-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </span>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-app-text">截贴图</span>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">分段</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-app-text-tertiary">每张尺寸比例 1:1.33，适用于公众号、小红书、抖音等平台的图文</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-app-text-tertiary opacity-0 transition group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ValidationFooter({
  result,
  status,
  progress,
}: {
  result: ValidationResult
  status: StreamStatus
  progress: string
}) {
  const [showWarnings, setShowWarnings] = useState(false)

  return (
    <div className="border-t border-app-border bg-app-surface px-4 py-3">
      <div className="flex items-center gap-3 text-[10px]">
        {result.passed ? (
          <span className="flex items-center gap-1 font-semibold text-app-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />
            校验通过 ✅
          </span>
        ) : (
          <span className="flex items-center gap-1 font-semibold text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {result.errors.length} 个错误
          </span>
        )}
        <span className="text-app-text-tertiary">span leaf: {result.spanLeafCount}</span>
        {result.warnings.length > 0 && (
          <button
            onClick={() => setShowWarnings((v) => !v)}
            className="cursor-pointer font-medium text-amber-500 transition hover:underline"
          >
            {result.warnings.length} 个警告 {showWarnings ? "▲" : "▼"}
          </button>
        )}
        {status === "error" && (
          <span className="ml-auto text-red-500">{progress}</span>
        )}
      </div>
      {result.errors.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {result.errors.slice(0, 10).map((e, i) => (
            <p key={i} className="text-[10px] text-red-500">• {e.message}</p>
          ))}
          {result.errors.length > 10 && (
            <p className="text-[10px] text-red-400 mt-1">…还有 {result.errors.length - 10} 个错误未显示</p>
          )}
        </div>
      )}
      {showWarnings && result.warnings.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-app-border pt-1.5">
          {result.warnings.slice(0, 5).map((w, i) => (
            <p key={i} className="text-[10px] text-amber-600">• {w.message}</p>
          ))}
        </div>
      )}
    </div>
  )
}
