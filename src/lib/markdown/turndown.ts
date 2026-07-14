import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})

turndown.addRule('strikethrough', {
  filter: ['del', 's', 'strike'] as unknown as TurndownService.Filter,
  replacement: (content: string) => `~~${content}~~`,
})

turndown.addRule('underline', {
  filter: (node: HTMLElement) => node.nodeName === 'U' || node.nodeName === 'INS',
  replacement: (content: string) => `<u>${content}</u>`,
})

/** 保留需要恢复的内联样式（font-family / font-size / color / font-weight） */
function pickInlineStyle(node: HTMLElement): string | null {
  const style = node.getAttribute('style') || ''
  const keep: string[] = []
  // font-family
  const ff = style.match(/font-family\s*:\s*([^;]+)/i)
  if (ff) keep.push(`font-family:${ff[1].trim()}`)
  // font-size
  const fs = style.match(/font-size\s*:\s*([^;]+)/i)
  if (fs) keep.push(`font-size:${fs[1].trim()}`)
  // color
  const c = style.match(/(?:^|;\s*)color\s*:\s*([^;]+)/i)
  if (c) keep.push(`color:${c[1].trim()}`)
  // font-weight
  const fw = style.match(/font-weight\s*:\s*([^;]+)/i)
  if (fw) keep.push(`font-weight:${fw[1].trim()}`)
  return keep.length ? keep.join(';') : null
}

/** 遍历节点，把带样式的标签转换为内联 span */
function convertStyledNodes(root: HTMLElement) {
  const styled = root.querySelectorAll('[style]')
  styled.forEach((el) => {
    const styleStr = pickInlineStyle(el as HTMLElement)
    if (styleStr) {
      const span = document.createElement('span')
      span.setAttribute('style', styleStr)
      span.innerHTML = el.innerHTML
      el.replaceWith(span)
    } else {
      el.removeAttribute('style')
    }
  })
}

export function htmlToMarkdown(html: string): string {
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    // 浏览器端：使用 DOMParser 预处理，把可恢复的内联样式转换为内联 span
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    convertStyledNodes(doc.body.firstElementChild as HTMLElement)
    html = doc.body.firstElementChild?.innerHTML || html
  }
  return turndown.turndown(html).trim()
}
