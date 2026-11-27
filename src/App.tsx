import { useEffect } from "react"
import { useThemeStore } from "./store/useThemeStore"
import { useSettingsStore } from "./store/useSettingsStore"
import { useEditorStore } from "./store/useEditorStore"
import { TopBar } from "./components/layout/TopBar"
import { LeftPanel } from "./components/layout/LeftPanel"
import { MiddlePanel } from "./components/layout/MiddlePanel"
import { RightPanel } from "./components/layout/RightPanel"
import { ApiKeyDialog } from "./components/topbar/ApiKeyDialog"
import { CustomThemeDialog } from "./components/topbar/CustomThemeDialog"
import { BalanceAlert } from "./components/topbar/BalanceAlert"
import { useDialogFlash } from "./hooks/useDialogFlash"

function ClearConfirmDialog() {
  const clearConfirmOpen = useEditorStore((s) => s.clearConfirmOpen)
  const setClearConfirmOpen = useEditorStore((s) => s.setClearConfirmOpen)
  const clearAll = useEditorStore((s) => s.clearAll)
  const { ref: panelRef, backdropProps } = useDialogFlash<HTMLDivElement>(clearConfirmOpen)

  if (!clearConfirmOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center dialog-scrim" {...backdropProps}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="w-[360px] rounded-2xl bg-app-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "dialogIn 0.18s ease-out" }}
      >
        <p className="mb-2 text-sm font-semibold text-app-text">清空全部内容</p>
        <p className="mb-5 text-xs text-app-text-secondary">清空后，文案内容、Markdown 和预览三个区域的内容都会被清除，此操作不可恢复。</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setClearConfirmOpen(false)}
            className="cursor-pointer rounded-lg border border-app-border px-4 py-1.5 text-xs text-app-text-secondary transition hover:bg-app-hover"
          >
            取消
          </button>
          <button
            onClick={clearAll}
            className="cursor-pointer rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen)
  const websiteThemeId = useThemeStore((s) => s.websiteThemeId)
  const loadCustomThemes = useThemeStore((s) => s.loadCustomThemes)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const loadImgbbConfig = useSettingsStore((s) => s.loadImgbbConfig)

  useEffect(() => {
    loadCustomThemes()
    loadSettings()
    loadImgbbConfig()
  }, [loadCustomThemes, loadSettings, loadImgbbConfig])

  useEffect(() => {
    document.documentElement.setAttribute("data-website-theme", websiteThemeId)
  }, [websiteThemeId])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-bg p-2.5">
      <TopBar />
      <div className="mt-2.5 flex flex-1 gap-2.5 overflow-hidden">
        {leftPanelOpen ? <LeftPanel /> : <button onClick={() => useEditorStore.getState().setLeftPanelOpen(true)} className="flex w-6 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text-tertiary transition hover:bg-app-hover hover:text-app-text" title="展开左侧面板"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4v16M9 5l7 7-7 7" /></svg></button>}
        <MiddlePanel />
        <RightPanel />
      </div>
      <ApiKeyDialog />
      <CustomThemeDialog />
      <BalanceAlert />
      <ClearConfirmDialog />
    </div>
  )
}
