import { createPortal } from 'react-dom'
import { useSettingsStore } from '../../store/useSettingsStore'

interface Props {
  show: boolean
  onClose: () => void
}

/** 图床未配置时的提示弹窗，点击"去配置"打开 ImgBB 配置菜单 */
export function ImgbbPrompt({ show, onClose }: Props) {
  if (!show) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="flex w-72 flex-col rounded-2xl bg-app-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-app-text">图床未配置</span>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-tertiary transition hover:bg-app-hover">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-app-text-secondary">
          请先配置图床 API Key，才能上传图片。注册 ImgBB 即可免费获取。
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-app-border px-4 py-1.5 text-[11px] font-medium text-app-text-secondary transition hover:bg-app-hover">
            取消
          </button>
          <button
            onClick={() => { useSettingsStore.getState().setShowImgbbDialog(true); onClose() }}
            className="rounded-lg bg-app-accent px-4 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
          >
            去配置
          </button>
        </div>
      </div>
    </div>
  , document.body)
}
