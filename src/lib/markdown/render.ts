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

/** 从主题组件库 Markdown 中提取 HTML 代码块，合成为实时预览 */
export function extractThemePreviewHtml(md: string): string {
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
          blocks.push(currentBlock.trim())
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

  if (blocks.length === 0) {
    // 没有 HTML 块，回退到 markdownToHtml
    return markdownToHtml(md)
  }

  // 用分隔线将各组件拼接
  const componentsHtml = blocks
    .map((b) => `<div style="margin-bottom:16px;">${b}</div>`)
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
