import type { ThemeMeta } from "../../types"

export async function buildTypesetPrompt(
  markdown: string,
  theme: ThemeMeta,
  themeComponentLibrary: string,
  commonComponents: string,
  skillCore: string,
): Promise<{ messages: Array<{ role: "system" | "user"; content: string }> }> {
  const themeName = String(theme && theme.name ? theme.name : "未知主题")
  const themeColor = String(theme && theme.color ? theme.color : "#000")
  const themeScene = String(theme && theme.scene ? theme.scene : "")
  const themeUnderline = String(theme && theme.underlineCss ? theme.underlineCss : "")

  // 检测 Markdown 中是否包含图片（无图文章禁止使用任何含 <img> 的组件，防止模型编造图片）
  const hasImage = /!\[.*?\]\(.+?\)/.test(markdown)

  const noImageRule = hasImage
    ? ""
    : "\n\n## ⚠️ 本文无图片 · 强制规则\n" +
      "本文的 Markdown 中没有任何图片（没有 ![]() 语法）。排版时必须严格遵守：\n" +
      "1. **禁止使用任何含 `<img>` 标签的组件**——包括封面配图、卡片配图、图片容器等\n" +
      "2. 封面组件必须用**纯文字版变体**，不要包含图片槽位（右侧图/背景图/头像等）\n" +
      "3. 数据卡片、要点卡片等组件用**纯文字版**，去掉所有图片占位\n" +
      "4. **绝对不要自创图片 URL 或凭空编造图片**\n" +
      "5. 如果组件库中某组件只有含图版本，则跳过该组件，改用其他文字组件替代\n"

  // system prompt = SKILL.md 原文 + 运行时主题变量 + 主题库 + 通用库
  // 所有排版规则、平台红线、Gotchas、合规要求一律由 SKILL.md 本身约束，此处不重复
  const systemPrompt = skillCore + "\n\n" +
    "## 当前排版主题：" + themeName + "\n\n" +
    "### 主题设计变量\n" +
    "- 主色：" + themeColor + "\n" +
    "- 适用场景：" + themeScene + "\n" +
    "- 正文下划线 CSS：" + themeUnderline + "\n\n" +
    "### 主题专属组件库\n" +
    themeComponentLibrary + "\n\n" +
    "### 通用组件库（代码块/图片/小标签标题）\n" +
    commonComponents + "\n\n" +
    "## 🔴 原文保真铁律（正文必须逐字保留）\n" +
    "1. **正文文字逐字保留**：正文内容必须与原始 Markdown 完全一致，禁止改写、缩写、扩写、润色、调序或重新组织语言。\n" +
    "2. **只做样式层转换**：标点全角化、`**加粗**`/`==高亮==`/`<u>下划线</u>` 等标记映射为对应样式组件、按规则给每段 1–3 个关键词短语加下划线——文字本身一个字都不能变。\n" +
    "3. **正文段落必须与原文一一对应**：正文 `<p>` 只能来自原文段落，逐字转写，禁止新增/改写/合并/拆分。**总结性内容可以有，但只能用非正文组件呈现**：开场白用引言卡组件放最前面，段后一两句摘要用摘要卡组件单独成块——**绝不能把总结/概述写成正文 `<p>` 混入正文流**，也不能在正文中插入原文不存在的段落。\n" +
    "4. **唯一例外**：章节编号、英文标签、目录/导读（精选 3 个看点）、结尾作者签名区/CTA 卡属于衍生元素而非正文，按 SKILL 规则生成。\n" +
    "5. **二级标题来源**：Markdown 里已有的 `##` 标题，标题文字原样使用、一字不改，禁止自行总结/改写/润色/重拟；只有 Markdown 完全没有 `##` 标题时，才允许总结分析段落内容生成二级标题。\n" +
    "6. **分行分段保真**：原文的行/段结构原样保留，禁止自动整合、合并或拆分——每个空行分隔的段落独立成块，段内换行用 `<br>` 保留；不得把相邻段落并成一段，也不得多行拼成一行。\n\n" +
    "**🚨 输出格式铁律（这是最常出错的环节，必须严格遵守）**：\n" +
    "1. **你只能输出一段纯 HTML 源码**，从第一个字符到最后一个字符全部都是 HTML，**绝对禁止输出任何其他内容**。\n" +
    "2. **绝对禁止输出你的思考过程、检查清单、状态总结、自我对话**——比如「让我检查一下」「我需要运行脚本」「所有文字节点都已包裹」「头图卡中的 [...] 用了 ✓」「列表项内部有...」这类内心独白/校验过程/勾选状态，**一个字都不能写进输出里**。这些只是给你自己看的（并且你也不需要真的写出来），**输出里完全不需要**。\n" +
    "3. 禁止任何前缀文字（不要写「以下是」「输出如下」「我来帮你…」「好的」「这是排版后的结果」）、后缀说明（不要写「完成」「结束」「以上就是…」「希望你喜欢」）、代码围栏标记（```）、Markdown 包裹、解释性文案。\n" +
    "4. 禁止使用省略号 `…` 或 `...` 截断、检查过程、过渡语句。\n" +
    "5. 输出必须以 `<section` 开头，以 `</section>` 结尾，**首尾直接是 HTML 标签，中间无任何非 HTML 内容**，正文第一段必须是文章的实际内容（或封面卡组件），不得是面向用户的提示语。\n" +
    "6. **禁止使用 `position` 定位（`absolute/fixed/sticky` 微信不支持，粘贴后会失效变形）**——序号、角标、徽章、左侧竖条等一律用 `display:inline-block` 或 `display:flex` 排布，禁止用 `left/top/right/bottom` 做绝对定位。\n" +
    "7. **`<span leaf=\"\">` 内只能放纯文本**——需要加粗/下划线/变色时写成 `<span style=\"…\"><span leaf=\"\">文字</span></span>`（样式标签在外、leaf 在内），禁止把带样式的 `<span>` 放进 leaf 里面（粘贴到公众号后内部样式会失效）。\n" +
    "8. 如果输出不符合以上任何一条，整篇文章都不可用。" +
    noImageRule

  // user prompt = 排版指令 + 原始 Markdown（agent 直接执行 skill 时也是这么传的）
  const userPrompt = "请将以下 Markdown 文章用「" + themeName + "」主题完整排版为公众号 HTML。直接输出纯 HTML 正文片段（<section>…</section>），不要任何说明文字或代码围栏。\n\n## 原始 Markdown 内容\n\n" + markdown

  return {
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
  }
}
export interface CustomThemeParams {
  name: string
  color: string
  scene: string
  description: string
  referenceImageBase64?: string
}

export async function buildCustomThemePrompt(
  params: CustomThemeParams,
  themeGeneratorInstructions: string,
): Promise<{
  messages: Array<{
    role: "system" | "user"
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  }>
}> {
  // 严格按 skill 规则：使用 theme-generator.md 的【生成提示词】作为核心系统提示
  const genPromptStart = themeGeneratorInstructions.indexOf("## 【生成提示词】")
  const genPrompt = genPromptStart > 0
    ? themeGeneratorInstructions.slice(genPromptStart).trim()
    : themeGeneratorInstructions

  // 追加输出格式——强制约束输出规模与结构：
  // theme-generator.md 的【生成提示词】要求输出 45~75 个区块的纯 HTML 区块库，
  // 直接采用会导致输出 token 量膨胀 2-3 倍、生成极慢。
  // 这里强制覆盖为「标准主题组件库 Markdown + 精选 20-35 个核心组件」，
  // 与线上版本一致，保证生成速度与可复用性。
  const systemPrompt = genPrompt + "\n\n" +
    "---\n\n" +
    "## 输出格式：标准主题组件库 Markdown（非纯 HTML 区块库）\n\n" +
    "**第一步**：在第一行输出主题元信息注释：\n" +
    "`<!-- theme: 2-6字中文名 --><!-- theme-id: theme-英文id --><!-- color: #HEX --><!-- scene: 适用场景 --><!-- desc: 风格描述 -->`\n\n" +
    "**第二步**：按以下 5 个章节输出完整 Markdown：\n\n" +
    "### 1. 设计变量速查表\n" +
    "用 ` ``` ` 代码围栏列出：主色调 / 辅色 / 标题色 / 正文色 / 次要文字 / 注释色 / 分割线色 / 浅底 / 浅边框 / 字号(正文必须15px) / 行高 / 间距 / max-width(677px) / 内容区边距(组件 margin:0 10px，全局容器禁止左右 padding)。\n\n" +
    "**🔴 正文字号铁律**：所有正文段落组件的 `font-size` 必须为 `15px`，不得使用其他字号（14px/16px/17px 等）。章节标题、引用块、卡片等非正文组件可用更大字号（最大 24px），但正文段落统一为 15px。在设计变量表中的「字号」项必须写 `正文15px`。\n" +
    "**🔴 章节标题字号铁律**：所有 `##` 二级章节标题组件的 `font-size` 必须为 `20px`，不得使用 18px/22px 等其他字号。三级子标题可用 16px，但二级标题统一为 20px。\n\n" +
    "### 2. 各组件完整 HTML\n" +
    "精选 20-35 个核心组件，按 `## 组件 N 组件名称` 编号，组件 1 为「全局容器」。每个组件放在 ` ```html ` 围栏内。\n" +
    "所有文字必须用 `<span leaf=\"\">文字</span>` 包裹，装饰空元素放 `<span leaf=\"\"><br></span>`。\n" +
    "**必须包含「行内样式组件族」**——正文行内强调用的 6 种变体缺一不可（编号 6a~6f）：\n" +
    "  · 6a 主色加粗（`**文字**` 用）：`<span style=\"color:主题主色;font-weight:bold;\"><span leaf=\"\">文字</span></span>`\n" +
    "  · 6b 主色下划线（`<u>文字</u>` / `++文字++` 用，正文关键词标记）：`<span style=\"border-bottom:2px solid 主题浅色;font-weight:600;\"><span leaf=\"\">文字</span></span>`\n" +
    "  · 6c 渐变高亮（`==文字==` 用）：`<span style=\"color:#111827;font-weight:bold;border-bottom:3px solid 主题浅色;\"><span leaf=\"\">文字</span></span>`\n" +
    "  · 6d 删除线（`~~文字~~` 用）：`<span style=\"text-decoration:line-through;color:次要文字;\"><span leaf=\"\">文字</span></span>`\n" +
    "  · 6e 行内代码（`` `code` `` 用）：`<span style=\"background:浅灰底;color:主题深色;padding:1px 6px;border-radius:4px;font-family:monospace;\"><span leaf=\"\">code</span></span>`\n" +
    "  · 6f 彩色强调文字（重点词用）：`<span style=\"color:主题主色;font-weight:600;\"><span leaf=\"\">文字</span></span>`\n" +
    "这 6 种行内变体是排版时正文标记（加粗/下划线/高亮/删除线/代码/强调色）的唯一映射目标，禁止缺失或用普通段落冒充。\n" +
    "**目录规则**：自定义主题一律不生成目录组件。不要在主题中包含任何形式的目录/导读/本文看点组件。\n" +
    "每个带图片槽位的组件都提供纯文字版变体。\n" +
    "**底部互动区（footer-cta 必选）**：严格遵循摸鱼绿主题 13a 的结构，分两个独立区域：\n" +
    "  **区域一（作者签名区）**：以正文段落形式放在 footer-cta 之前，用 `我是 {{作者名}}，{{一句话简介}}`\n" +
    "  **区域二（互动卡片 — 细边框容器）**：用 `<section style=\"border:1px solid 主题分割线色;border-radius:16px;padding:32px 20px;text-align:center;margin:0 0 24px;\">` 包裹，容器内按顺序包含：\n" +
    "    · 引导文案：`<p style=\"font-size:13px;font-weight:bold;line-height:1.6;color:#111827;margin-bottom:20px;\">既然看到这里了，如果觉得有用，随手点个赞、在看、转发三连吧。</span></p>`（措辞可微调）\n" +
    "    · 三个图标的**横向布局**：外层 `<p style=\"text-align:center;margin:0 0 16px;padding:0;white-space:nowrap;\">`，每个图标用 `<span style=\"display:inline-block;text-align:center;color:#4B5563;vertical-align:top;margin:0 24px;\">`，**不要用 width:33% 撑满**，用 margin 控制间距，图标自身宽度由内容自然撑起\n" +
    "    · 每个图标内：40×40px 圆形白色容器 `<span style=\"display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border:1px solid #F3F4F6;\">` 包裹 SVG + 下方 `<span style=\"display:block;font-size:10px;font-weight:600;text-align:center;margin-top:6px;\">` 文字标签\n" +
    "    · 转发图标容器色改为主题主色：`color:主题主色`、`background:主题浅底色`、`border-color:主题主色半透明`、`box-shadow:0 2px 4px 主题主色半透明`\n" +
    "    · 底部 `<p style=\"font-size:10px;color:#9CA3AF;letter-spacing:1px;margin:0;\">THANKS FOR READING</p>`\n" +
    "  SVG 图标代码原样复制下方摸鱼绿的三个图标，禁止自己画或换图标：\n" +
    "  点赞：`<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3\"></path></svg>`\n" +
    "  在看：`<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><circle cx=\"12\" cy=\"12\" r=\"3\"></circle><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"></path></svg>`\n" +
    "  转发：`<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 18v-4a8 8 0 0 1 8-8h8\"></path><polyline points=\"16 2 20 6 16 10\"></polyline></svg>`\n\n" +
    "### 3. 完整文章模板骨架\n" +
    "用 ` ```html ` 围栏展示从封面→→各章节→结尾的完整装配顺序。目录如果存在，必须放在封面之后、第一个章节标题之前，禁止放在标题/封面前面。\n\n" +
    "### 4. 文章类型 → 组件组合配方表\n" +
    "用 Markdown 表格列出：教程/测评/观点/复盘/随笔 等文章类型各用哪些核心组件。配方表中必须明确列出目录组件（如果有的话），自定义主题不包含目录组件，所有配方行中都不出现目录组件。\n\n" +
    "### 5. Markdown → 组件映射规则表\n" +
    "用 Markdown 表格列出，**必须逐条覆盖以下全部语法**（缺一行就视为不完整）：\n" +
    "`# 标题`（不生成）/`## 章节标题`/`### 子标题`/`**加粗**`/`==高亮==`/`<u>下划线</u>` 或 `++文字++`/`~~删除线~~`/`` `行内代码` ``/`> 引用`/`- 无序列表`/`1. 有序列表`/`| 表格 |`/`![]()` 图片/` ``` 代码块 ``` `，每行必须指明对应组件编号（行内标记映射到 6a~6f 行内样式族）。\n\n" +
    "---\n\n" +
    "## 平台红线（必须遵守）\n\n" +
    "- 禁止：`<style>`/`<script>`/`<div>`/`class`/`id`/`position:fixed/absolute/sticky`/`float`/`@media`/`@keyframes`/`display:grid`\n" +
    "- 样式全部内联 `style`，可用标签：`<section>`/`<p>`/`<span>`/`<strong>`/`<img>`/`<h3>`/`<hr>`/`<br>`/`<figure>`/`<figcaption>`/`<em>`\n" +
    "- 字体栈：`-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`\n\n" +
    "## 设计原创性要求\n" +
    "你的设计必须完全基于用户提供的描述推导，不得参考或模仿任何内置主题的骨架、组件排列方式、命名方式或版式组合。\n" +
    "封面布局、卡片结构、颜色搭配等所有设计决策都应当从用户描述中自然推导，而不是套用现成模板。\n\n" +
    "请严格遵循以上所有格式规范，直接输出完整的主题组件库 Markdown 文件。"

  const isImageMode = !!(params.referenceImageBase64)

  // --- 构建用户提示 ---
  let userText: string

  if (isImageMode && !params.name && !params.description) {
    userText = "请根据参考图片提取配色、风格、场景等信息，按规范生成完整的主题组件库文件。输出必须是完整的 Markdown，包含 `html 代码块。"
  } else if (isImageMode) {
    userText = "## 设计参数\n- 主题名称：" + params.name + "\n- 主色调：" + params.color +
      "\n- 适用场景：" + params.scene + "\n- 风格描述：" + params.description +
      "\n\n请结合参考图片和以上参数，按规范生成完整的主题组件库文件。输出必须是完整的 Markdown，包含 `html 代码块。"
  } else {
    userText = "## 设计参数\n" +
      (params.name ? "- 主题名称：" + params.name + "\n" : "") +
      (params.color ? "- 主色调：" + params.color + "\n" : "") +
      (params.scene ? "- 适用场景：" + params.scene + "\n" : "") +
      "- 风格描述：" + params.description +
      "\n\n请以上述参数为核心，设计一套与该描述匹配的原创主题。" +
      "你的设计应反映描述中的氛围、风格和配色倾向，而不是参考现有的模板或内置主题。" +
      "封面、卡片等组件的排列方式和视觉风格应从描述中自然推导。" +
      "按规范生成完整的主题组件库文件。"
  }

  let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  if (params.referenceImageBase64) {
    userContent = [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: params.referenceImageBase64 } },
    ]
  } else {
    userContent = userText
  }

  return {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  }
}

export async function buildRichTextToMarkdownPrompt(html: string): Promise<string> {
  return [
    "请将以下富文本 HTML 转换为干净的 Markdown。",
    "",
    "要求：",
    "1. 保留所有标题层级（h1→#，h2→##，h3→###）",
    "2. 粗体→**，斜体→*，下划线→<u>，删除线→~~",
    "3. 图片→![](src)，保留原始 URL",
    "4. 列表→- 或 1.",
    "5. 引用→>",
    "6. 代码块用三反引号围栏包裹",
    "7. 表格→markdown 表格",
    "8. 剥离所有样式属性和 span 嵌套",
    "9. 剔除剪存工具元信息（原文链接/剪存时间等）",
    "10. 不要增删改写原文实质内容，只做格式转换",
    "",
    "---",
    "",
    html,
  ].join("\n")
}
