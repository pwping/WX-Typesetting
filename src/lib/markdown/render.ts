// 简易 Markdown → HTML 转换，用于自定义主题预览
export function markdownToHtml(md: string): string {
  const lines = md.split("\n")
  let html = ""
  let inCodeBlock = false
  let codeContent = ""
  let codeLang = ""

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code fence
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html += `<pre style="background:#1E293B;color:#E2E8F0;padding:12px 16px;border-radius:8px;overflow-x:auto;font-size:12px;line-height:1.6;margin:8px 0;"><code>${codeContent}</code></pre>`
        codeContent = ""
        codeLang = ""
        inCodeBlock = false
      } else {
        inCodeBlock = true
        codeLang = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += escapeHtml(line) + "\n"
      continue
    }

    // Empty line
    if (line.trim() === "") {
      html += "<br>"
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      html += '<hr style="border:0;border-top:1px solid #E5E7EB;margin:16px 0;">'
      continue
    }

    // Headers
    const h1 = line.match(/^# (.+)/)
    if (h1) { html += `<h1 style="font-size:20px;font-weight:700;color:#111827;margin:20px 0 8px;padding-bottom:8px;border-bottom:2px solid #E5E7EB;">${h1[1]}</h1>`; continue }

    const h2 = line.match(/^## (.+)/)
    if (h2) { html += `<h2 style="font-size:17px;font-weight:700;color:#374151;margin:18px 0 6px;">${h2[1]}</h2>`; continue }

    const h3 = line.match(/^### (.+)/)
    if (h3) { html += `<h3 style="font-size:16px;font-weight:600;color:#4B5563;margin:14px 0 4px;">${h3[1]}</h3>`; continue }

    // Blockquote
    if (line.startsWith("> ")) {
      const q = line.replace(/^> ?/, "")
      html += `<blockquote style="border-left:3px solid #D1D5DB;padding:4px 12px;margin:8px 0;color:#6B7280;font-size:13px;">${q}</blockquote>`
      continue
    }

    // Table separator
    if (line.trim().match(/^\|[\s\-:|]+\|$/)) {
      continue
    }

    // Table row
    const tableRow = line.match(/^\|(.+)\|$/)
    if (tableRow) {
      const cells = tableRow[1].split("|").map((c) => c.trim())
      const isHeader = i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s\-:|]+\|$/)
      const tag = isHeader ? "th" : "td"
      const cellHtml = cells.map((c) => `<${tag} style="border:1px solid #E5E7EB;padding:6px 12px;font-size:13px;text-align:left;">${c}</${tag}>`).join("")
      html += `<tr>${cellHtml}</tr>`
      if (isHeader) {
        html = html.replace("<tr>", '<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead><tr>')
        html += "</thead><tbody>"
      }
      if (i + 1 >= lines.length || !lines[i + 1].trim().match(/^\|/)) {
        html += "</tbody></table>"
      }
      continue
    }

    // Bold
    let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;">$1</strong>')
    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code style="background:#F3F4F6;color:#DC2626;padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>')

    html += `<p style="font-size:14px;color:#374151;line-height:1.7;margin:4px 0;">${processed}</p>`
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;padding:20px;max-width:700px;margin:0 auto;background:#fff;}</style></head><body>${html}</body></html>`
}

/** 剥离 HTML 注释（元信息等，程序内部解析用，不显示在渲染结果里） */
function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

/** 裁剪 HTML 字符串，只保留第一个真实标签到最后一个闭合标签之间的内容，
 *  去掉开头/结尾的说明文字（提示词/思考内容） */
function trimToHtmlRange(html: string): string {
  let clean = stripHtmlComments(html).trim()
  const firstTagIdx = clean.search(/<[a-zA-Z][^>]*>/)
  if (firstTagIdx === -1) return clean
  const lastClose = clean.match(/<\/[a-zA-Z][^>]*>\s*$/)
  const endIdx = lastClose ? (lastClose.index ?? 0) + lastClose[0].length : clean.lastIndexOf('>')
  if (endIdx <= firstTagIdx) return clean
  return clean.substring(firstTagIdx, endIdx).trim()
}

/** 从主题组件库 Markdown 中提取 HTML 代码块，合成为实时预览 */
export function extractThemePreviewHtml(md: string, opts?: { isFinal?: boolean }): string {
  const blocks: string[] = []
  let inHtmlBlock = false
  let currentBlock = ""

  const lines = md.split("\n")
  for (const line of lines) {
    const isOpening = line.trim().startsWith("```html")
    const isClosing = line.trim() === "```"
    if (isClosing) {
      if (inHtmlBlock) {
        if (currentBlock.trim()) {
          blocks.push(trimToHtmlRange(currentBlock))
        }
        currentBlock = ""
        inHtmlBlock = false
      }
      continue
    }
    if (isOpening) {
      inHtmlBlock = true
      currentBlock = ""
      continue
    }
    if (inHtmlBlock) {
      currentBlock += line + "\n"
    }
  }

  // 流式生成中：最后一个 ```html 块可能还没闭合，把它作为"生成中"块实时展示，
  // 避免整篇预览空白（纯 debounce + 未闭合丢弃 = 白板）
  let unclosedBlock: string | null = null
  if (inHtmlBlock && currentBlock.trim()) {
    // 流式阶段只剥离注释、不裁剪尾部（尾部标签可能还没写完）
    unclosedBlock = stripHtmlComments(currentBlock).trim()
  }

  if (blocks.length === 0 && !unclosedBlock) {
    // theme-generator.md 要求 LLM「输出纯 HTML 不要加 Markdown 围栏」
    // 这种情况下没有 ```html 代码块，原文本身就是 HTML，直接作为预览源
    const trimmed = md.trim()
    const looksLikeHtml = /^<(!doctype|html|section|div|p|span|img|h\d|figure|hr)/i.test(trimmed)
                  || /<section[^>]*>[\s\S]*<\/section>/i.test(trimmed)
    if (looksLikeHtml) {
      // 无围栏直接输出 HTML 的情况：裁剪到真实 HTML 范围，去掉开头/结尾的提示词和注释
      const cleanHtml = trimToHtmlRange(trimmed)
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    margin: 0;
    padding: 10px;
    background: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }
  .preview-scroll { max-width: 677px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
</style>
</head>
<body>
<div class="preview-scroll">
${cleanHtml}
</div>
</body>
</html>`
    }
    // 不是 HTML 且非完成态（流式生成中）：模型还在输出元信息注释/提示词结构，
    // 此时不渲染原始文本，显示"生成中"占位，避免出现"提示词的输出"
    if (!opts?.isFinal) {
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    margin: 0;
    padding: 0;
    background: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .loading { text-align: center; color: #6B7280; }
  .spinner {
    width: 32px;
    height: 32px;
    margin: 0 auto 14px;
    border: 3px solid #E5E7EB;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading p { font-size: 14px; margin: 0 0 6px; }
  .loading small { font-size: 12px; color: #9CA3AF; }
</style>
</head>
<body>
<div class="loading">
  <div class="spinner"></div>
  <p>正在生成主题组件，实时预览即将出现…</p>
  <small>已接收 ${md.length} 字符</small>
</div>
</body>
</html>`
    }
    // 完成时兜底：不是 HTML，回退到 markdownToHtml
    return markdownToHtml(md)
  }

  // 用分隔线将各组件拼接
  const parts = blocks.map((b) => `<div style="margin-bottom:16px;">${b}</div>`)
  if (unclosedBlock) {
    parts.push(`<div style="margin-bottom:16px;position:relative;min-height:40px;">${unclosedBlock}</div>`)
  }
  const componentsHtml = parts
    .join('\n<hr style="border:0;border-top:1px dashed #E5E7EB;margin:4px 0;">\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    margin: 0;
    padding: 10px;
    background: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }
  .preview-scroll { max-width: 677px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
</style>
</head>
<body>
<div class="preview-scroll">
${componentsHtml}
</div>
</body>
</html>`
}
