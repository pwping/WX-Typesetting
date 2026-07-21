import type { Editor } from '@tiptap/react'
import { useState } from 'react'

interface ToolbarProps {
  editor: Editor
}

export function Toolbar({ editor }: ToolbarProps) {
  const [uploading, setUploading] = useState(false)

  const uploadAndInsert = async (file: File) => {
    const raw = localStorage.getItem('gzh_imgbb')
    if (!raw) { alert('请先点击左侧「图床API」配置 ImgBB Key'); return }
    let cfg: { apiKey: string; expiration: number }
    try { cfg = JSON.parse(raw) } catch { alert('图床配置异常，请重新配置'); return }
    if (!cfg.apiKey) { alert('请先配置 ImgBB API Key'); return }

    setUploading(true)
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve((r.result as string).split(',')[1])
        r.onerror = () => reject(new Error('读取文件失败'))
        r.readAsDataURL(file)
      })

      const form = new FormData()
      form.append('key', cfg.apiKey)
      form.append('image', b64)
      if (cfg.expiration > 0) form.append('expiration', String(cfg.expiration))

      const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        throw new Error(`上传失败 (${res.status}): ${err.slice(0, 100)}`)
      }
      const json = await res.json()
      // 取原图 URL（data.image.url 或 data.url，非 display_url）
      const url = json?.data?.image?.url || json?.data?.url
      if (!url) throw new Error('接口未返回图片地址')

      editor.chain().focus().setImage({ src: url }).run()
    } catch (err: any) {
      alert('图片上传失败: ' + (err?.message || '未知错误'))
    } finally {
      setUploading(false)
    }
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
    // TODO: 图片上传功能暂不开放
    // { icon: uploading ? '⏳' : '🖼', title: '上传图片', action: () => {
    //   const input = document.getElementById('gzh-img-upload') as HTMLInputElement
    //   input?.click()
    // } },
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
      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}
          className="flex h-7 items-center rounded px-2 text-[11px] text-app-text-secondary transition hover:bg-app-hover disabled:opacity-30" title="撤销">↶</button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}
          className="flex h-7 items-center rounded px-2 text-[11px] text-app-text-secondary transition hover:bg-app-hover disabled:opacity-30" title="重做">↷</button>
      </div>
      {/* TODO: 图片上传功能暂不开放 */}
      {/* <input id="gzh-img-upload" type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndInsert(f) }} /> */}
    </div>
  )
}
