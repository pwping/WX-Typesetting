import { useSettingsStore } from '../../store/useSettingsStore'
import { useDialogFlash } from '../../hooks/useDialogFlash'

export function BalanceAlert() {
  const show = useSettingsStore((s) => s.showBalanceAlert)
  const setShow = useSettingsStore((s) => s.setShowBalanceAlert)
  const modelId = useSettingsStore((s) => s.modelId)
  const protocol = useSettingsStore((s) => s.protocol)
  const rawMessage = useSettingsStore((s) => s.balanceAlertMessage)
  const { ref: panelRef, backdropProps } = useDialogFlash<HTMLDivElement>(show)

  if (!show) return null

  const isInvalidKey = rawMessage.startsWith('密钥无效:')
  const targetLabel =
    (isInvalidKey ? rawMessage.replace('密钥无效:', '') : rawMessage) ||
    modelId ||
    (protocol === 'anthropic' ? 'Anthropic' : 'OpenAI')

  const openApiConfig = () => {
    setShow(false, '')
    setTimeout(() => useSettingsStore.getState().setShowApiKeyDialog(true), 100)
  }

  return (
    <div
      className="dialog-scrim fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      {...backdropProps}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="ml-8 w-[420px] self-start rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-medium text-app-text">
            <span className="text-lg">{isInvalidKey ? '😰' : '😅'}</span>
            {targetLabel} {isInvalidKey ? 'API Key 无效' : '余额或额度不足'}
          </h2>
          <button
            onClick={() => setShow(false, '')}
            className="text-app-text-tertiary transition hover:text-app-text"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 mt-3 text-xs leading-relaxed text-app-text-secondary">
          {isInvalidKey
            ? `当前模型（${targetLabel}）鉴权失败，请检查 Base URL、接口协议（OpenAI / Anthropic）、模型名称和 API Key 是否填写正确。`
            : `当前 API 账户（${targetLabel}）余额或额度不足，排版和文案生成功能暂时无法使用。你可以前往服务商充值，或切换其他可用的接口配置。`}
        </p>

        <div className="rounded-xl border border-app-border bg-app-hover p-4">
          <p className="text-xs font-semibold text-app-text">修改 API 配置</p>
          <p className="mt-1 text-[11px] leading-relaxed text-app-text-secondary">
            重新检查或更换 Base URL、模型名称与 API Key 后即可继续使用。
          </p>
          <button
            onClick={openApiConfig}
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-app-accent px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
          >
            打开 API 配置 →
          </button>
        </div>

        <p className="mt-4 text-[10px] text-app-text-tertiary">
          API Key 使用浏览器指纹加密后存储在本地，不会上传到任何服务器。
        </p>
      </div>
    </div>
  )
}
