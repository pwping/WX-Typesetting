import { useState, useEffect, useRef } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { API_PROTOCOLS, API_PRESETS, buildEndpointUrl } from '../../lib/llm/providers'
import { testConnection } from '../../lib/llm/client'
import type { ConnectionTestResult } from '../../lib/llm/client'
import { useDialogFlash } from '../../hooks/useDialogFlash'
import type { ApiProtocol } from '../../types'

export function ApiKeyDialog() {
  const show = useSettingsStore((s) => s.showApiKeyDialog)
  const setShow = useSettingsStore((s) => s.setShowApiKeyDialog)
  const protocol = useSettingsStore((s) => s.protocol)
  const baseUrl = useSettingsStore((s) => s.baseUrl)
  const modelId = useSettingsStore((s) => s.modelId)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const isKeyValid = useSettingsStore((s) => s.isKeyValid)
  const saveApiConfig = useSettingsStore((s) => s.saveApiConfig)
  const clearApiConfig = useSettingsStore((s) => s.clearApiConfig)

  const [selectedProtocol, setSelectedProtocol] = useState<ApiProtocol>(protocol)
  const [inputBaseUrl, setInputBaseUrl] = useState(baseUrl)
  const [inputModel, setInputModel] = useState(modelId)
  const [inputKey, setInputKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const testSeqRef = useRef(0)
  const { ref: panelRef, backdropProps } = useDialogFlash<HTMLDivElement>(show)

  useEffect(() => {
    if (show) {
      setSelectedProtocol(protocol)
      setInputBaseUrl(baseUrl)
      setInputModel(modelId)
      setInputKey(apiKey)
      setShowKey(false)
      setError('')
      setTesting(false)
      setTestResult(null)
      testSeqRef.current += 1
    }
  }, [show, protocol, baseUrl, modelId, apiKey])

  if (!show) return null

  const activeProtocol = API_PROTOCOLS.find((p) => p.id === selectedProtocol) || API_PROTOCOLS[0]
  const resolvedEndpoint = buildEndpointUrl(inputBaseUrl, selectedProtocol)

  const handleApplyPreset = (preset: (typeof API_PRESETS)[number]) => {
    setSelectedProtocol(preset.protocol)
    setInputBaseUrl(preset.baseUrl)
    setError('')
    resetTest()
  }

  const handleSave = () => {
    const trimmedUrl = inputBaseUrl.trim()
    const trimmedModel = inputModel.trim()
    const trimmedKey = inputKey.trim()

    // 若之前已配置且当前全部清空，视为清除配置
    if (!trimmedUrl && !trimmedModel && !trimmedKey && isKeyValid) {
      clearApiConfig()
      setShow(false)
      return
    }

    if (!trimmedUrl) {
      setError('请输入 Base URL')
      return
    }
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      setError('Base URL 必须以 http:// 或 https:// 开头')
      return
    }
    if (!trimmedModel) {
      setError('请输入模型名称 (Model)')
      return
    }
    if (!trimmedKey) {
      setError('请输入 API Key')
      return
    }

    saveApiConfig({
      protocol: selectedProtocol,
      baseUrl: trimmedUrl,
      modelId: trimmedModel,
      apiKey: trimmedKey,
    })
    setShow(false)
  }

  const handleClear = () => {
    clearApiConfig()
    setShow(false)
  }

  const canTest = Boolean(inputBaseUrl.trim() && inputModel.trim() && inputKey.trim())

  const handleTest = async () => {
    const trimmedUrl = inputBaseUrl.trim()
    const trimmedModel = inputModel.trim()
    const trimmedKey = inputKey.trim()

    if (!trimmedUrl || !trimmedModel || !trimmedKey) {
      setTestResult({ ok: false, message: '请先填写 Base URL、模型名称和 API Key', latencyMs: 0 })
      return
    }
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      setTestResult({ ok: false, message: 'Base URL 必须以 http:// 或 https:// 开头', latencyMs: 0 })
      return
    }

    const seq = ++testSeqRef.current
    setTesting(true)
    setTestResult(null)

    const result = await testConnection({
      protocol: selectedProtocol,
      baseUrl: trimmedUrl,
      modelId: trimmedModel,
      apiKey: trimmedKey,
    })

    // 弹窗已关闭或输入已改动，丢弃这次结果
    if (seq !== testSeqRef.current) return
    setTesting(false)
    setTestResult(result)
  }

  const resetTest = () => {
    if (testResult || testing) {
      testSeqRef.current += 1
      setTesting(false)
      setTestResult(null)
    }
  }

  const canSubmit =
    Boolean(inputBaseUrl.trim() && inputModel.trim() && inputKey.trim()) ||
    (isKeyValid && !inputBaseUrl.trim() && !inputModel.trim() && !inputKey.trim())

  return (
    <div className="dialog-scrim fixed inset-0 z-50 flex items-center justify-center" {...backdropProps}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="w-[500px] rounded-2xl bg-app-surface p-6 shadow-xl"
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
          {/* 接口协议 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-app-text-secondary">
                接口协议 (Base URL 格式)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-app-text-tertiary">快速填充 Base URL：</span>
                {API_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="rounded border border-app-border px-1.5 py-0.5 text-[10px] text-app-text-secondary transition hover:border-app-accent hover:text-app-accent"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {API_PROTOCOLS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProtocol(p.id)
                    setError('')
                    resetTest()
                  }}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
                    selectedProtocol === p.id
                      ? 'border-app-accent bg-app-accent-light'
                      : 'border-app-border hover:bg-app-hover'
                  }`}
                >
                  <span className="text-xs font-medium text-app-text">{p.label}</span>
                  <span className="mt-0.5 text-[10px] text-app-text-tertiary">{p.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              Base URL
            </label>
            <input
              type="url"
              value={inputBaseUrl}
              onChange={(e) => {
                setInputBaseUrl(e.target.value)
                if (error) setError('')
                resetTest()
              }}
              placeholder={activeProtocol.placeholderBaseUrl}
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent"
            />

          </div>

          {/* 模型名称 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              模型名称 (Model)
            </label>
            <input
              type="text"
              value={inputModel}
              onChange={(e) => {
                setInputModel(e.target.value)
                if (error) setError('')
                resetTest()
              }}
              placeholder={activeProtocol.placeholderModel}
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-secondary">
              API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value)
                  if (error) setError('')
                  resetTest()
                }}
                placeholder="输入 API Key"
                className="flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent"
              />
              <button
                type="button"
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

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-500">{error}</p>
          )}
        </div>

        {/* 测试连接 */}
        <div className="mt-4 rounded-xl border border-app-border bg-app-hover/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-app-text">测试连接</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-app-text-tertiary">
                用当前填写的地址、模型和 Key 发一次最小请求，连接成功后再保存配置。
              </p>
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !canTest}
              className="shrink-0 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-xs font-medium text-app-text-secondary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing ? '测试中…' : '测试连接'}
            </button>
          </div>

          {testing && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-app-text-tertiary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-app-accent" />
              正在请求模型，请稍候…
            </p>
          )}

          {testResult && (
            <div
              className={`mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed ${
                testResult.ok ? 'bg-app-accent-light text-app-accent-text' : 'bg-red-50 text-red-500'
              }`}
            >
              <span className="mt-px shrink-0">{testResult.ok ? '✓' : '✕'}</span>
              <span className="min-w-0 break-words">{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <div>
            {isKeyValid && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 transition hover:bg-red-50"
              >
                清空配置
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="rounded-lg border border-app-border px-4 py-2 text-xs text-app-text-secondary hover:bg-app-hover"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="rounded-lg bg-app-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-30"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
