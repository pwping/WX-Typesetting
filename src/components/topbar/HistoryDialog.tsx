import { useHistoryStore } from "../../store/useHistoryStore"
import { copyHtmlToClipboard, downloadHtml } from "../../lib/clipboard/copyHtml"
import { useState } from "react"

const PAGE_SIZE = 10

type ConfirmAction =
  | { type: "clearAll" }
  | { type: "delete"; id: string; title: string }

export function HistoryDialog({ onClose }: { onClose: () => void }) {
  const records = useHistoryStore((s) => s.records)
  const deleteRecord = useHistoryStore((s) => s.deleteRecord)
  const clearAll = useHistoryStore((s) => s.clearAll)
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const totalPages = Math.ceil(records.length / PAGE_SIZE)
  const pageRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handlePreview = (html: string, title: string) => {
    setPreviewHtml(html)
    setPreviewTitle(title)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmAction) return
    if (confirmAction.type === "delete") {
      await deleteRecord(confirmAction.id)
      if (pageRecords.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    } else if (confirmAction.type === "clearAll") {
      await clearAll()
      setCurrentPage(1)
    }
    setConfirmAction(null)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, "0")
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
  }

  const confirmTitle = confirmAction?.type === "clearAll"
    ? "清空全部记录"
    : "删除记录"
  const confirmMessage = confirmAction?.type === "clearAll"
    ? "确定要清空所有排版历史记录吗？删除后无法恢复。"
    : "确定删除「" + (confirmAction?.type === "delete" ? confirmAction.title : "") + "」吗？删除后无法恢复。"

  return (
    <>
      {/* History list dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <div
          className="flex max-h-[90vh] w-[640px] flex-col rounded-2xl border border-app-border bg-app-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-app-border px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-app-text">排版历史</h3>
              <p className="text-[10px] text-app-text-tertiary mt-0.5">每次排版渲染成功后自动保存，点击预览可回看效果</p>
            </div>
            <div className="flex items-center gap-2">
              {records.length > 0 && (
                <button
                  onClick={() => setConfirmAction({ type: "clearAll" })}
                  className="cursor-pointer rounded-lg bg-app-accent px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                >
                  清空全部
                </button>
              )}
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-1.5 text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-app-text-tertiary">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-center">
                <p className="text-xs">暂无排版记录</p>
                <p className="mt-1 text-[10px]">每次排版渲染成功后会自动保存到这里</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {pageRecords.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface p-3.5 transition hover:border-app-accent/40 hover:shadow-sm"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: r.themeColor }}
                    title={r.themeName}
                  >
                    {(currentPage - 1) * PAGE_SIZE + i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-app-text">{r.title}</p>
                    <p className="mt-0.5 text-[10px] text-app-text-tertiary">
                      {formatTime(r.createdAt)} · {r.themeName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handlePreview(r.html, r.title)}
                      className="cursor-pointer rounded-lg bg-app-accent px-3 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90"
                    >
                      预览
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "delete", id: r.id, title: r.title })}
                      className="cursor-pointer rounded-lg p-1.5 text-app-text-tertiary transition hover:bg-red-50 hover:text-red-400"
                      title="删除"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {records.length > 0 && (
            <div className="flex items-center justify-between border-t border-app-border px-6 py-3">
              <p className="text-[10px] text-app-text-tertiary">
                共 {records.length} 条记录
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-secondary transition hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
                >
                  上一页
                </button>
                <span className="text-[10px] text-app-text-tertiary">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-secondary transition hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30" onClick={() => setPreviewHtml(null)}>
          <div
            className="flex max-h-[90vh] w-[640px] flex-col rounded-2xl border border-app-border bg-app-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-border px-6 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className="shrink-0 text-xs font-semibold text-app-text">排版预览</h3>
                <span className="truncate text-[11px] text-app-text-tertiary">{previewTitle}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={async () => {
                    const ok = await copyHtmlToClipboard(previewHtml)
                    if (ok) setCopiedId("preview")
                    setTimeout(() => setCopiedId(null), 2000)
                  }}
                  className="cursor-pointer rounded-lg bg-app-accent px-3 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90"
                >
                  {copiedId === "preview" ? "已复制!" : "复制到公众号"}
                </button>
                <button
                  onClick={() => downloadHtml(previewHtml, "article.html")}
                  className="cursor-pointer rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-[10px] font-medium text-app-text-secondary transition hover:bg-app-hover"
                >
                  导出
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="cursor-pointer rounded-lg p-1.5 text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <iframe
                srcDoc={
                  "<html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{margin:0;padding:16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}.gzh-wrapper{max-width:677px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}</style></head><body><div class=\"gzh-wrapper\">" +
                  previewHtml +
                  "</div></body></html>"
                }
                className="h-full min-h-[90vh] w-full rounded-lg border border-app-border bg-white"
                title="历史排版预览"
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30" onClick={() => setConfirmAction(null)}>
          <div
            className="w-[360px] rounded-2xl bg-app-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-semibold text-app-text">{confirmTitle}</p>
            <p className="mb-5 text-xs text-app-text-secondary">{confirmMessage}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="cursor-pointer rounded-lg border border-app-border px-4 py-1.5 text-xs text-app-text-secondary transition hover:bg-app-hover"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="cursor-pointer rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
