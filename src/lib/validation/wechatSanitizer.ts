/**
 * 公众号 HTML 样式净化器
 *
 * 微信编辑器在内容分析（自检/分析）时会剥离它不支持的 CSS 属性。
 * 本函数提前移除这些属性，避免粘贴后样式大面积丢失变成纯文本。
 *
 * 已知微信编辑器不支持/不可靠的属性：
 * - display:flex / inline-flex → 会被剥离，导致所有 flex 布局元素坍缩为纯文本
 * - box-shadow → 被剥离
 * - background: linear-gradient(...) → 被剥离
 * - overflow / overflow-x / overflow-y → 被剥离（且可能触发整段被标记为"复杂内容"）
 * - background: rgba(...) → 部分场景被剥离
 */

// 需要从内联 style 中移除的 CSS 属性（正则匹配）
const REMOVAL_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /position\s*:\s*(fixed|absolute|sticky)\s*;?\s*/gi, replacement: '' },
  // 移除 overflow 相关（会触发整段降级）
  { pattern: /overflow(?:-x|-y)?\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  // 移除 box-shadow（完全不支持）
  { pattern: /box-shadow\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  // 移除 linear-gradient 背景
  { pattern: /background\s*:\s*[^;]*linear-gradient[^;]*;?\s*/gi, replacement: '' },
  // 移除 background: rgba(...) 中带透明度的（部分场景有问题）
  { pattern: /background\s*:\s*rgba\s*\([^)]+\)\s*;?\s*/gi, replacement: '' },
  // 移除 display: flex / inline-flex（微信编辑器不可靠）
  { pattern: /display\s*:\s*(flex|inline-flex)\s*;?\s*/gi, replacement: '' },
  // 移除 flex 相关派生属性（父级 flex 被移除后它们无效）
  { pattern: /flex\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /flex-shrink\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /flex-grow\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /flex-basis\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /order\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /gap\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  // 移除 justify-content（flex 的派生）
  { pattern: /justify-content\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /align-items\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /align-self\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  // 移除 transform（不支持）
  { pattern: /transform\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  { pattern: /transition\s*:\s*[^;]+;?\s*/gi, replacement: '' },
  // 移除 font-family 中的外部字体引用（保留标准系统字体）
  // 注意：只移除 font-family 整行太激进，由主题自行处理
]

// 修复移除 flex 后元素完全无布局的问题
// 1. 原本 display:flex 的容器 → 加 display:block 兜底
// 2. 移除了 justify-content/align-items 后留空
const POST_CLEANUP: Array<{ test: RegExp; addStyle: string }> = [
  // 容器类：section 加 display:block 兜底（原 flex 容器）
  { test: /<(section|p)\s[^>]*>/gi, addStyle: '' },
]

export function sanitizeForWeChat(html: string): string {
  let result = html

  // 第一阶段：移除不支持的属性
  for (const { pattern, replacement } of REMOVAL_RULES) {
    result = result.replace(pattern, replacement)
  }

  // 第二阶段：清理残留的空 style 属性
  result = result.replace(/\s+style\s*=\s*""/gi, '')
  result = result.replace(/\s+style\s*=\s*''/gi, '')
  // style="   "（只有空白）
  result = result.replace(/\s+style\s*=\s*"\s+"/gi, '')
  result = result.replace(/\s+style\s*=\s*'\s+'/gi, '')

  return result
}
