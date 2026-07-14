import { useEditorStore } from '../../store/useEditorStore'

export function MarkdownEditor() {
  const markdown = useEditorStore((s) => s.markdown)
  const setMarkdown = useEditorStore((s) => s.setMarkdown)

  return (
    <div className="h-full">
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        className="md-editor"
        placeholder="# 文章标题&#10;&#10;在这里直接输入 Markdown 内容...&#10;&#10;## 章节标题&#10;&#10;正文内容..."
        spellCheck={false}
      />
    </div>
  )
}
