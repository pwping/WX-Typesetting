import { useRef, useEffect, useState } from "react"
import { useEditorStore } from "../../store/useEditorStore"
import { useThemeStore } from "../../store/useThemeStore"
import { copyHtmlToClipboard, downloadHtml } from "../../lib/clipboard/copyHtml"
import type { ValidationResult, StreamStatus } from "../../types"

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

  return (
    <div className="flex w-[30%] min-w-[260px] flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
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
