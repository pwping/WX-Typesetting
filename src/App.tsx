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
    </div>
  )
}
