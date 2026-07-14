export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  // 优先使用现代 Clipboard API，直接写入 HTML——避免 execCommand 和 innerHTML 解析导致样式丢失
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
        }),
      ])
      return true
    } catch {
      // 降级到 execCommand 方案
    }
  }

  // 降级方案：通过 DOM 复制
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  document.body.appendChild(container)

  const range = document.createRange()
  range.selectNodeContents(container)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  sel?.removeAllRanges()
  document.body.removeChild(container)
  return ok
}

export function downloadHtml(html: string, filename: string): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${filename}</title>
</head>
<body>
${html}
</body>
</html>`
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}