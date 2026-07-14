import { useState, useEffect, useMemo, useRef } from 'react'
import { useThemeStore } from '../../store/useThemeStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import type { ThemeMeta } from '../../types'
import { getApiKey } from '../../lib/storage/crypto'
import { HistoryDialog } from '../topbar/HistoryDialog'
import { useHistoryStore } from '../../store/useHistoryStore'

export function TopBar() {
  const builtinThemes = useThemeStore((s) => s.builtinThemes)
  const customThemes = useThemeStore((s) => s.customThemes)
  const selectedThemeId = useThemeStore((s) => s.selectedThemeId)
  const selectTheme = useThemeStore((s) => s.selectTheme)
  const websiteThemeId = useThemeStore((s) => s.websiteThemeId)
  const setWebsiteTheme = useThemeStore((s) => s.setWebsiteTheme)
  const loadHistory = useHistoryStore((s) => s.loadRecords)

  const setShowApiKeyDialog = useSettingsStore((s) => s.setShowApiKeyDialog)
  const setShowCustomThemeDialog = useSettingsStore((s) => s.setShowCustomThemeDialog)
  const keyVersion = useSettingsStore((s) => s.keyVersion)

  const deepseekKey = useMemo(() => getApiKey('deepseek'), [keyVersion])
  const kimiKey = useMemo(() => getApiKey('moonshot'), [keyVersion])
  const anyKeyValid = !!(deepseekKey?.apiKey || kimiKey?.apiKey)
  const showAuto = !!(deepseekKey?.apiKey && kimiKey?.apiKey)

  const [deleteTarget, setDeleteTarget] = useState<ThemeMeta | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const allThemes = [...builtinThemes, ...customThemes]
  // UI 换肤只取前 3 个主题色
  const uiThemeColors = builtinThemes.slice(0, 3)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadHistory() }, [loadHistory])

  // 选中主题后自动滚动到可见区域
  useEffect(() => {
    if (!scrollRef.current || !selectedThemeId) return
    const el = scrollRef.current.querySelector(`[data-theme-id="${selectedThemeId}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'end', behavior: 'smooth' })
    }
  }, [selectedThemeId])

  return (
    <header className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <span className="rounded-lg bg-[var(--app-accent)] px-2.5 py-1.5 text-sm font-medium text-white">AI 智能排版工作台</span>
      </div>

      <div className="mx-2 h-5 w-px shrink-0 bg-app-border" />

      {/* 主题区域：卡片列表最多显示7个，超出滚动；+按钮始终可见 */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto py-[6px] max-w-[60rem]">
          {builtinThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={selectedThemeId === theme.id}
              onClick={() => selectTheme(theme.id)}
            />
          ))}
          {customThemes.length > 0 && (
            <>
              <div className="mx-2 h-5 w-px shrink-0 bg-app-border" />
              {customThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={selectedThemeId === theme.id}
                  onClick={() => selectTheme(theme.id)}
                  onDelete={() => setDeleteTarget(theme)}
                />
              ))}
            </>
          )}
        </div>
        <button
          onClick={() => setShowCustomThemeDialog(true)}
          className="flex h-[60px] min-w-[120px] flex-row items-center justify-center gap-2 rounded-lg bg-app-accent px-3 text-white transition hover:opacity-90"
          title="自定义主题"
        >
          <span className="text-lg">+</span>
          <span className="text-[10px] font-medium">自定义主题</span>
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="flex h-[60px] min-w-[120px] flex-row items-center justify-center gap-2 rounded-lg bg-app-accent px-3 text-white transition hover:opacity-90"
          title="排版历史"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-medium">排版历史</span>
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-app-border" />

      <div className="flex items-center gap-2">
        <WebsiteThemeSwitcher
          websiteThemeId={websiteThemeId}
          themes={uiThemeColors}
          onSwitch={setWebsiteTheme}
        />
        <div className="mx-2 h-5 w-px bg-app-border" />

        <button
          onClick={() => setShowApiKeyDialog(true)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
            anyKeyValid
              ? 'border-app-accent/30 bg-app-accent-light text-app-accent-text'
              : 'border-app-border bg-app-hover text-app-text-secondary'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${anyKeyValid ? 'bg-app-accent' : 'bg-app-text-tertiary'}`} />
          {anyKeyValid ? (
            showAuto
              ? <span>AUTO</span>
              : <span>{deepseekKey ? deepseekKey.modelId : kimiKey?.modelId}</span>
          ) : '配置 API'}
        </button>
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-[360px] rounded-2xl bg-app-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-semibold text-app-text">删除自定义主题</p>
            <p className="mb-5 text-xs text-app-text-secondary">
              确定删除「{deleteTarget.name}」吗？删除后无法恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-lg border border-app-border px-4 py-1.5 text-xs text-app-text-secondary transition hover:bg-app-hover"
              >
                取消
              </button>
              <button
                onClick={() => {
                  useThemeStore.getState().deleteCustomTheme(deleteTarget.id)
                  setDeleteTarget(null)
                }}
                className="cursor-pointer rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && <HistoryDialog onClose={() => setShowHistory(false)} />}
    </header>
  )
}

function ThemeCard({
  theme,
  selected,
  onClick,
  onDelete,
}: {
  theme: ThemeMeta
  selected: boolean
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <button
      onClick={onClick}
      data-theme-id={theme.id}
      title={`${theme.name} · ${theme.scene}`}
      className={`group relative flex h-[60px] min-w-[120px] flex-col items-start justify-center gap-1.5 rounded-lg border-2 px-3 transition ${
        selected
          ? 'cursor-pointer border-app-accent bg-app-accent-light'
          : 'cursor-pointer border-app-border bg-app-surface hover:bg-app-hover'
      }`}
    >
      {!theme.isBuiltin ? (
        <span className="absolute right-0 top-0 z-10 -translate-y-1/2 rounded-full bg-app-accent px-1.5 py-0.5 text-[8px] font-semibold text-white shadow-sm">自定义</span>
      ) : (
        <span className="absolute right-0 top-0 z-10 -translate-y-1/2 rounded-full bg-app-accent px-1.5 py-0.5 text-[8px] font-semibold text-white shadow-sm">内置</span>
      )}
      <div className="flex w-full items-center gap-1">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: theme.color }}
        />
        <span className={`min-w-0 text-xs font-medium ${selected ? 'text-app-accent-text' : 'text-app-text'}`}>
          {theme.name}
        </span>
      </div>
      <span className="text-[10px] text-app-text-tertiary line-clamp-1">
        {theme.scene}
      </span>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-100"
          title="删除主题"
        >
          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </button>
  )
}

function WebsiteThemeSwitcher({
  websiteThemeId,
  themes,
  onSwitch,
}: {
  websiteThemeId: string
  themes: ThemeMeta[]
  onSwitch: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-app-text-secondary">UI 换肤</span>
      <div className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface p-0.5">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onSwitch(t.id)}
            className={`cursor-pointer h-6 w-6 rounded transition ${
              websiteThemeId === t.id
                ? 'ring-2 ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              background: t.color,
              ...(websiteThemeId === t.id
                ? { '--tw-ring-color': t.color } as React.CSSProperties
                : {}),
            }}
            title={t.name}
          />
        ))}
      </div>
    </div>
  )
}
