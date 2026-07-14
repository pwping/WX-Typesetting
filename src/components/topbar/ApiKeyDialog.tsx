import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { PROVIDERS, getProvider } from '../../lib/llm/providers'
import { getApiKey } from '../../lib/storage/crypto'

export function ApiKeyDialog() {
  const show = useSettingsStore((s) => s.showApiKeyDialog)
  const setShow = useSettingsStore((s) => s.setShowApiKeyDialog)
  const providerId = useSettingsStore((s) => s.providerId)
  const modelId = useSettingsStore((s) => s.modelId)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const saveKey = useSettingsStore((s) => s.saveKey)
  const removeKey = useSettingsStore((s) => s.removeKey)
  const setProvider = useSettingsStore((s) => s.setProvider)

  const [inputKey, setInputKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(providerId)
  const [selectedModel, setSelectedModel] = useState(modelId)
  const [initialKey, setInitialKey] = useState('')

  // 弹窗打开时重新加载当前保存的配置，避免组件挂载时 store 尚未加载导致的状态空值
  useEffect(() => {
    if (show) {
      const currentProvider = providerId
      const stored = getApiKey(currentProvider)
      setSelectedProvider(currentProvider)
      if (stored?.apiKey) {
        setSelectedModel(stored.modelId)
        setInputKey(stored.apiKey)
        setInitialKey(stored.apiKey)
      } else {
        const p = getProvider(currentProvider)
        if (p) {
          setSelectedModel(p.models[0].id)
        }
        setInputKey('')
        setInitialKey('')
      }
    }
  }, [show])

  if (!show) return null

  const provider = getProvider(selectedProvider)

  const handleSave = () => {
    const key = inputKey.trim()
    if (!key) {
      removeKey(selectedProvider)
    } else {
      saveKey(selectedProvider, selectedModel, key)
    }
    setShow(false)
  }

  const handleProviderChange = (newProviderId: string) => {
    setSelectedProvider(newProviderId)
    setProvider(newProviderId)
    // 尝试读取已保存的 API Key 和模型
    const stored = getApiKey(newProviderId)
    if (stored?.apiKey) {
      setSelectedModel(stored.modelId)
      setInputKey(stored.apiKey)
    } else {
      const newProvider = getProvider(newProviderId)
      if (newProvider) {
        setSelectedModel(newProvider.models[0].id)
      }
      setInputKey('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShow(false)}>
      <div
        className="w-[480px] rounded-2xl bg-app-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-app-text">API 配置</h2>
          <button
            onClick={() => setShow(false)}
            className="text-app-text-tertiary transition hover:text-app-text"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              模型供应商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                    selectedProvider === p.id
                      ? 'border-app-accent bg-app-accent-light'
                      : 'border-app-border hover:bg-app-hover'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-app-text">{p.name}</span>
                    {p.id === 'agnes' && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        免费
                      </span>
                    )}
                    {p.supportsVision && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        识图
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {getApiKey(p.id)?.apiKey ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        已配置
                      </span>
                    ) : (
                      <span className="rounded bg-app-hover px-1.5 py-0.5 text-[9px] text-app-text-tertiary">
                        未配置
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              模型
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent"
            >
              {provider?.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.supportsVision ? '支持图片' : '仅文字'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={`输入 ${provider?.name} API Key`}
                className="flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg border border-app-border px-3 py-2 text-xs text-app-text-secondary hover:bg-app-hover"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-app-text-tertiary">
              Key 使用浏览器指纹加密后存储在本地，不会上传到任何服务器。
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setShow(false)}
            className="rounded-lg border border-app-border px-4 py-2 text-xs text-app-text-secondary hover:bg-app-hover"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!inputKey.trim() && !initialKey}
            className="rounded-lg bg-app-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-30"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
