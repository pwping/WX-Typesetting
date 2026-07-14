import type { ValidationResult, ValidationIssue } from '../../types'

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; level: 'ERROR' | 'WARNING'; message: string }> = [
  { regex: /<style[\s>]/i, level: 'ERROR', message: '<style> 标签会被过滤，样式必须内联' },
  { regex: /<script[\s>]/i, level: 'ERROR', message: '<script> 标签会被过滤' },
  { regex: /<\/?div[\s>]/i, level: 'ERROR', message: '<div> 会被改写，请用 <section>' },
  { regex: /<link[\s>]/i, level: 'ERROR', message: '外部 <link>（CSS/字体）会被过滤' },
  { regex: /\sclass\s*=/i, level: 'ERROR', message: 'class 属性会被剥离，请用内联 style' },
  { regex: /\sid\s*=/i, level: 'ERROR', message: 'id 属性会被剥离' },
  { regex: /position\s*:\s*(fixed|absolute|sticky)/i, level: 'ERROR', message: 'position fixed/absolute/sticky 不被支持' },
  { regex: /float\s*:/i, level: 'ERROR', message: 'float 不被支持' },
  { regex: /@media/i, level: 'ERROR', message: '@media 媒体查询不被支持' },
  { regex: /@keyframes/i, level: 'ERROR', message: '@keyframes 动画不被支持' },
  { regex: /@import/i, level: 'ERROR', message: '@import 不被支持' },
  { regex: /display\s*:\s*grid/i, level: 'ERROR', message: 'display:grid 不被支持，请用 flex' },
  { regex: /var\s*\(\s*--/i, level: 'ERROR', message: 'CSS 变量 var(--x) 不被支持' },
  { regex: /url\s*\(\s*['"]?https?:\/\/[^)]*\.(woff2?|ttf|otf|eot)/i, level: 'ERROR', message: '外部字体不被支持' },
]

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u9fff]/
const SKIP_TAGS = new Set(['head', 'title', 'style', 'script'])
const HALF_PUNCT_REGEX = /[\u4e00-\u9fff\u3400-\u9fff][,;!?]/
const ASCII_QUOTE_REGEX = /["']/
const CODE_STYLE_REGEX = /monospace|white-space\s*:\s*pre|courier|consolas|sf mono/i

export function validateHtml(html: string): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  for (const { regex, level, message } of FORBIDDEN_PATTERNS) {
    const matches = html.match(new RegExp(regex.source, regex.flags + 'g'))
    const count = matches ? matches.length : 0
    if (count > 0) {
      const issue: ValidationIssue = { level, message: `${message}（命中 ${count} 处）`, count }
      if (level === 'ERROR') errors.push(issue)
      else warnings.push(issue)
    }
  }

  const { spanLeafCount, unwrapped, halfPunct } = checkLeafWrapping(html)

  const hasCjk = CJK_REGEX.test(html)
  if (hasCjk && spanLeafCount === 0) {
    errors.push({
      level: 'ERROR',
      message: '全文没有任何 <span leaf=""> 包裹——粘贴到公众号后样式会大面积丢失',
    })
  }
  if (unwrapped.length > 0) {
    const sample = unwrapped.slice(0, 5).map((u) => `「${u.snippet}」(在 <${u.parent}> 内)`).join('；')
    warnings.push({
      level: 'WARNING',
      message: `${unwrapped.length} 处中文文本未被 <span leaf> 包裹——粘贴到公众号后这些文字样式会丢失。例：${sample}`,
    })
  }

  if (halfPunct.length > 0) {
    const sample = halfPunct.slice(0, 5).map((s) => `「${s}」`).join('；')
    warnings.push({
      level: 'WARNING',
      message: `${halfPunct.length} 处正文疑似半角标点/英文引号，应改中文全角（代码块内不计）。例：${sample}`,
    })
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    spanLeafCount,
  }
}

interface LeafCheckResult {
  spanLeafCount: number
  unwrapped: Array<{ snippet: string; parent: string }>
  halfPunct: string[]
}

function checkLeafWrapping(html: string): LeafCheckResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  let spanLeafCount = 0
  const unwrapped: Array<{ snippet: string; parent: string }> = []
  const halfPunct: string[] = []

  function walkNode(node: Node, parentTag: string, inLeaf: boolean, inCode: boolean): void {
    if (node.nodeType !== Node.TEXT_NODE) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tag = el.tagName.toLowerCase()

        if (SKIP_TAGS.has(tag)) return

        const style = el.getAttribute('style') || ''
        const isLeaf = tag === 'span' && el.hasAttribute('leaf')
        const isCode = CODE_STYLE_REGEX.test(style) || tag === 'code' || tag === 'pre'

        if (isLeaf) spanLeafCount++

        for (const child of Array.from(el.childNodes)) {
          walkNode(child, tag, inLeaf || isLeaf, inCode || isCode)
        }
      }
      return
    }

    const text = node.textContent?.trim() || ''
    if (!text || !CJK_REGEX.test(text)) return

    if (!inLeaf) {
      const snippet = text.slice(0, 24) + (text.length > 24 ? '…' : '')
      unwrapped.push({ snippet, parent: parentTag })
    }

    if (!inCode && (HALF_PUNCT_REGEX.test(text) || ASCII_QUOTE_REGEX.test(text))) {
      const snippet = text.slice(0, 24) + (text.length > 24 ? '…' : '')
      halfPunct.push(snippet)
    }
  }

  walkNode(doc.body, 'body', false, false)

  return { spanLeafCount, unwrapped, halfPunct }
}
