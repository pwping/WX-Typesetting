import { useSettingsStore } from '../../store/useSettingsStore'
import { PROVIDERS } from '../../lib/llm/providers'
import { getApiKey } from '../../lib/storage/crypto'

export function BalanceAlert() {
  const show = useSettingsStore((s) => s.showBalanceAlert)
  const setShow = useSettingsStore((s) => s.setShowBalanceAlert)
  const saveKey = useSettingsStore((s) => s.saveKey)
  const providerId = useSettingsStore((s) => s.providerId)
  const rawMessage = useSettingsStore((s) => s.balanceAlertMessage)

  // 判断告警类型：密钥无效 / 余额不足
  const isInvalidKey = rawMessage.startsWith('密钥无效:')
  const effectiveProviderName = isInvalidKey ? rawMessage.replace('密钥无效:', '') : rawMessage

  const failedProviderId = effectiveProviderName
    ? (PROVIDERS.find((p) => p.name === effectiveProviderName)?.id || PROVIDERS.find((p) => p.id === effectiveProviderName)?.id)
    : providerId
  const failedProvider = failedProviderId ? PROVIDERS.find((p) => p.id === failedProviderId) : null
  const currentProvider = failedProvider
  const failedProviderName = effectiveProviderName || currentProvider?.name || 'API'
  const deepseekUrl =
    failedProviderId === 'deepseek'
      ? 'https://platform.deepseek.com/top_up'
      : failedProviderId === 'moonshot'
        ? 'https://platform.moonshot.cn/console/billing'
        : null

  const otherProviders = PROVIDERS.filter((p) => p.id !== failedProviderId)

  const handleSwitchProvider = (newProviderId: string) => {
    const stored = getApiKey(newProviderId)
    if (stored?.apiKey) {
      saveKey(newProviderId, stored.modelId, stored.apiKey)
      setShow(false, '')
    } else {
      // 未保存 Key，先切换到该供应商，再打开 API 配置弹窗
      setShow(false, '')
      useSettingsStore.getState().setProvider(newProviderId)
      useSettingsStore.getState().setShowApiKeyDialog(true)
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]"
      onClick={() => setShow(false, '')}
    >
      <div
        className="ml-8 w-[420px] self-start rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-medium text-app-text">
            <span className="text-lg">{isInvalidKey ? '😰' : '😅'}</span>
            {currentProvider?.name || 'API'} {isInvalidKey ? 'API Key 无效' : '余额不足'}
          </h2>
          <button
            onClick={() => setShow(false, '')}
            className="text-app-text-tertiary transition hover:text-app-text"
          >
            ✕
          </button>
        </div>

        <p className="mb-1 mt-3 text-xs leading-relaxed text-app-text-secondary">
          {isInvalidKey
            ? `当前 ${currentProvider?.name || '当前'} 的 API Key 无效，请检查是否填写正确或已过期。`
            : `当前 ${currentProvider?.name || '当前'} API 账户余额已用完，排版和文案生成功能暂时无法使用。`}
        </p>

        <div className="my-4 space-y-3">
          {/* 方案一：充值或重新配置 */}
          {isInvalidKey ? (
            <div className="rounded-xl border border-app-border bg-app-hover p-4">
              <p className="text-xs font-semibold text-app-text">方案一：重新配置</p>
              <p className="mt-1 text-[11px] leading-relaxed text-app-text-secondary">
                请检查 {currentProvider?.name} 的 API Key 是否正确，或重新复制 Key 填入。
              </p>
              <button
                onClick={() => { setShow(false, ''); setTimeout(() => useSettingsStore.getState().setShowApiKeyDialog(true), 100) }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-app-accent px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
              >
                去配置 API Key →
              </button>
            </div>
          ) : (deepseekUrl && (
            <div className="rounded-xl border border-app-border bg-app-hover p-4">
              <p className="text-xs font-semibold text-app-text">方案一：充值</p>
              <p className="mt-1 text-[11px] leading-relaxed text-app-text-secondary">
                前往 {currentProvider?.name} 官网充值后继续使用。
              </p>
              <a
                href={deepseekUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-app-accent px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
              >
                前往充值 →
              </a>
            </div>
          ))}

          {/* 方案二：切换供应商 */}
          <div className="rounded-xl border border-app-border bg-app-hover p-4">
            <p className="text-xs font-semibold text-app-text">方案二：切换供应商</p>
            <p className="mt-1 text-[11px] leading-relaxed text-app-text-secondary">
              选择其他供应商继续使用：
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {otherProviders.map((p) => {
                const hasKey = !!getApiKey(p.id)?.apiKey
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProvider(p.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                      hasKey
                        ? 'bg-app-accent text-white hover:opacity-90'
                        : 'border border-app-border bg-app-surface text-app-text-secondary hover:bg-app-hover'
                    }`}
                    title={hasKey ? '已配置，一键切换' : '未配置，点击去配置'}
                  >
                    {p.name}
                    {hasKey && (
                      <span className="rounded bg-white/20 px-1 py-0.5 text-[9px]">已保存</span>
                    )}
                    {!hasKey && p.models.every((m) => m.costPer1kInput === 0) && (
                      <span className="rounded bg-green-100 px-1 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        免费
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        <p className="text-[10px] text-app-text-tertiary">
          API Key 使用浏览器指纹加密后存储在本地，不会上传到任何服务器。
        </p>
      </div>
    </div>
  )
}
