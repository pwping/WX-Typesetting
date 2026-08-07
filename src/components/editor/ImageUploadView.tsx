import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export function ImageUploadView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper
      data-upload-id={node.attrs.uploadId}
      className="my-2 flex min-h-[150px] w-full items-center justify-center rounded-lg border-2 border-dashed border-app-border bg-app-surface/60"
    >
      <div className="flex flex-col items-center gap-2 text-app-text-secondary">
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-xs">图片上传中…</span>
      </div>
    </NodeViewWrapper>
  )
}
