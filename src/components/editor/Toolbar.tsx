import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { uploadImage } from '../../lib/storage/imgUpload'
import { getSecret } from '../../lib/storage/crypto'
import { ImgbbPrompt } from './ImgbbPrompt'

interface ToolbarProps {
  editor: Editor
}

export function Toolbar({ editor }: ToolbarProps) {
  const [uploading, setUploading] = useState(false)
  const [showImgbbPrompt, setShowImgbbPrompt] = useState(false)

  const handleFile = (file: File) => {
    setUploading(true)
    uploadImage(
      file,
      (url) => { editor.chain().focus().setImage({ src: url }).run() },
      (msg) => { alert(msg) },
    ).finally(() => setUploading(false))
  }

  const tools: Array<{ icon: string; action: () => void; active?: boolean; title: string }> = [
    { icon: 'B', title: '加粗', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { icon: 'I', title: '斜体', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { icon: 'U', title: '下划线', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
    { icon: 'S', title: '删除线', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { icon: 'H1', title: '一级标题', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { icon: 'H2', title: '二级标题', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { icon: 'H3', title: '三级标题', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { icon: 'UL', title: '无序列表', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { icon: 'OL', title: '有序列表', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { icon: '"', title: '引用', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { icon: '</>', title: '代码块', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    { icon: '—', title: '分割线', action: () => editor.chain().focus().setHorizontalRule().run() },
    { icon: '🔗', title: '链接', action: () => { const url = window.prompt('输入链接 URL:'); if (url) editor.chain().focus().setLink({ href: url }).run() }, active: editor.isActive('link') },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-app-border bg-app-surface px-2 py-1.5">
      {tools.map((tool, i) => (
        <button key={i} onClick={tool.action} title={tool.title}
          className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[11px] font-medium transition ${
            tool.active ? 'bg-app-accent text-white' : 'text-app-text-secondary hover:bg-app-hover'
          }`}
        >{tool.icon}</button>
      ))}
      <span className="mx-1 h-5 w-px bg-app-border" />
      <button
        onClick={() => {
          if (!getSecret('imgbb_api_key')) { setShowImgbbPrompt(true); return }
          const input = document.getElementById('gzh-img-upload') as HTMLInputElement
          input?.click()
        }}
        disabled={uploading}
        title="上传图片"
        className="flex h-7 items-center gap-1 rounded-md border border-app-border bg-app-surface px-2 text-[11px] font-medium text-app-text-secondary transition hover:border-app-accent/30 hover:bg-app-accent-light hover:text-app-accent disabled:opacity-50"
      >
        {uploading ? (
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
        <span>上传图片</span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}
          className="flex h-7 items-center rounded px-2 text-[11px] text-app-text-secondary transition hover:bg-app-hover disabled:opacity-30" title="撤销">↶</button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}
          className="flex h-7 items-center rounded px-2 text-[11px] text-app-text-secondary transition hover:bg-app-hover disabled:opacity-30" title="重做">↷</button>
      </div>
      <input id="gzh-img-upload" type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <ImgbbPrompt show={showImgbbPrompt} onClose={() => setShowImgbbPrompt(false)} />
    </div>
  )
}
