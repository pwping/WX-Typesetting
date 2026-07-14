import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { useEditorStore } from '../../store/useEditorStore'
import { Toolbar } from './Toolbar'
import { useEffect, useRef } from 'react'

export function RichTextEditor() {
  const richTextHtml = useEditorStore((s) => s.richTextHtml)
  const setRichTextHtml = useEditorStore((s) => s.setRichTextHtml)
  const aiContentTrigger = useEditorStore((s) => s.aiContentTrigger)
  const scrollRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      FontSize,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-app-accent underline' },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: '开始输入你的公众号文章内容...',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
    ],
    // 用持久化的内容初始化，刷新后内容不会丢失
    content: richTextHtml || '',
    onUpdate: ({ editor }) => {
      setRichTextHtml(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none',
      },
    },
  })

  // 监听从外部（AI 生成/左侧面板）注入的内容 + 自动滚动到底部
  useEffect(() => {
    if (aiContentTrigger && editor) {
      const html = aiContentTrigger.replace(/^__ai_\d+__/, '')
      editor.commands.setContent(html)
      // 内容更新后，将滚动容器滚到底部，让用户实时看到最新生成的内容
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    }
  }, [aiContentTrigger, editor])

  if (!editor) return null

  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
