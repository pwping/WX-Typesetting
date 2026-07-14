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

  // 检测 Markdown 中是否包含图片
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

  const noImageUserRule = hasImage
    ? ""
    : "\n\n⚠️ 本文不含任何图片，请跳过所有图片相关组件，封面/卡片全部用纯文字版。"
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
    "请严格按照上述组件库的 HTML 代码进行排版。HTML 一律从组件库中取，不要凭记忆手写。一篇文章只用这一套主题的组件，不跨主题混用。\n\n" +
    "**⚠️ 目录组件铁律**：如果主题组件库中包含目录/导读/本文看点组件，则严格按照该组件的 HTML 结构（包括容器样式、颜色、排列方式、布局方向）进行渲染。**禁止自创目录样式、禁止改变目录的布局方式**。目录的显示方式（横向卡片滚动 or 竖向列表排列）由主题组件库中的目录组件 HTML 决定，你只负责按该样式填充内容，不得自行决定或改变。目录项数量必须与 ## 章节数量完全一致，有几个章节就显示几个，不得精选、不得跳过、不得省略任何章节。目录中的每个标题文字必须与下方 ## 章节标题完全一样，不得改写、不得缩写。目录项顺序必须与 ## 章节出现顺序完全一致。\n\n" +
      "每个目录项的内容（标题文字）必须根据 ## 章节内容动态生成，不能只复制主题模板中的示例文字。目录卡片上的标题文字必须与对应的 ## 章节标题一字不差。如果主题组件库中没有目录组件，则跳过目录，直接从封面进入正文。\n\n" +
    "**⚠️ 占位素材铁律**：原文中出现的以下占位标记，必须使用通用组件库中的 **2c 待补素材占位板块**（浅底柔虚线框 + 居中图标与说明）进行渲染，禁止用普通段落、引用块、左对齐提示或其他任何非 2c 的方式处理——2c 是唯一正确的占位组件，无论使用哪个主题都必须遵守：\n" +
    "- `【插入图片】`、`【插入视频】`、`【插入GIF】`、`【插入录屏】`、`【插入音频】`、`【插入xxx】` 等所有以 `【插入` 开头的标记\n" +
    "- `【配图：…】`、`【配图】` 等 PDF/格式转换产生的配图占位\n" +
    "- `[图表待补]`、`[图片待补]`、`[待录屏]`、`[待补GIF]` 等以 `[待` 或 `[图` 开头的方括号占位\n" +
    "- **位置必须与原文完全一致**：占位符在 Markdown 原文中的哪一段、哪一行出现，渲染后的 2c 组件就放在哪一段、哪一行，禁止将占位符移动到文章开头/结尾/其他位置\n\n" +
    "输出前请逐条检查：\n" +
    "1. 输出必须以 <section> 开头、</section> 结尾，不得有任何前缀文字、后缀说明、代码围栏标记（`）、或解释性文案。直接输出纯 HTML 源码\n" +
    "2. 是否所有文字节点都被 <span leaf=\"\">文字</span> 包裹？一个都不能漏\n" +
    "3. 是否有日期写死了某一天？用 {{日期}} （年月日）、{{月份}} （年月）占位\n" +
    "4. 是否没有使用 Markdown 代码围栏？输出直接是纯 HTML，不要包裹任何围栏标记\n" +
    "5. 代码块必须使用通用组件库中的 1a 深色代码块模板（每行一个 <p style=\"margin:0\">），禁止使用 <pre> 标签或 white-space:pre 样式。行内代码必须使用 1c 行内代码模板\n" +
    "6. 正文段落组件中的 font-size 是否为 16px？不允许更小或更大的字号\n" +
    "7. HTML 最后必须在所有组件闭合后添加一个空段落：`<p style='margin:0;'><span leaf=''><br></span></p>`，确保在公众号编辑器末尾有一个可点击输入的空白行，方便继续添加内容" +
    noImageRule

  const userPrompt = "请将以下 Markdown 文章用「" + themeName + "」主题完整排版为公众号 HTML。\n\n" +
    "章节规则：\n" +
    "- 有 ## 标题：直接用原标题\n" +
    "- 无 ## 标题：由你分析全文语义分章，提炼 4-6 字短标题\n\n" +
    "**输出顺序示例（必须严格遵守，不能改动顺序）：**\n" +
    "按照 Markdown 原文顺序，从头到尾逐段排版，不要自行调整内容顺序或移动位置\n\n" +
    "关键要求：\n" +
    "- 标题与正文完全匹配：目录中的每个标题必须与下方 ## 章节标题一字不差\n" +
    "- 目录项数量与 ## 章节数量完全一致，有几个显示几个，不得精选不得跳过\n" +
    "- 严格保持 Markdown 原文的段落分隔\n" +
    "- ### 三级标题不放入目录\n" +
    "\n\n## 原始 Markdown 内容\n\n" + markdown
  let userContent = userPrompt
  return {
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userContent },
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

  // 追加输出格式——依据 SKILL.md「添加新主题的规范」必须包含 5 个章节
  const systemPrompt = genPrompt + "\n\n" +
    "---\n\n" +
    "## 输出格式：标准主题组件库 Markdown（非纯 HTML 区块库）\n\n" +
    "**第一步**：在第一行输出主题元信息注释：\n" +
    "`<!-- theme: 2-6字中文名 --><!-- theme-id: theme-英文id --><!-- color: #HEX --><!-- scene: 适用场景 --><!-- desc: 风格描述 -->`\n\n" +
    "**第二步**：按以下 5 个章节输出完整 Markdown：\n\n" +
    "### 1. 设计变量速查表\n" +
    "用 ` ``` ` 代码围栏列出：主色调 / 辅色 / 标题色 / 正文色 / 次要文字 / 注释色 / 分割线色 / 浅底 / 浅边框 / 字号(正文必须16px，不可改) / 行高 / 间距 / max-width(677px) / 内容区边距(padding:0 10px) / TOC（取值：横向卡片 | 竖向列表 | 无）。\n\n" +
    "**🔴 正文字号铁律**：所有正文段落组件的 `font-size` 必须为 `16px`，不得使用其他字号（14px/15px/17px 等）。章节标题、引用块、卡片等非正文组件可用更大字号（最大 24px），但正文段落统一为 16px。在设计变量表中的「字号」项必须写 `正文16px`。\n" +
    "**🔴 章节标题字号铁律**：所有 `##` 二级章节标题组件的 `font-size` 必须为 `18px`，不得使用 17px/20px/22px 等其他字号。三级子标题可用 16px，但二级标题统一为 18px。\n\n" +
    "### 2. 各组件完整 HTML\n" +
    "精选 20-35 个核心组件，按 `## 组件 N 组件名称` 编号，组件 1 为「全局容器」。每个组件放在 ` ```html ` 围栏内。\n" +
    "所有文字必须用 `<span leaf=\"\">文字</span>` 包裹，装饰空元素放 `<span leaf=\"\"><br></span>`。\n" +
    "是否包含目录组件：分析设计风格后决定——信息密度高的主题（教程/测评/科技/数据/商务/工具盘点）需要目录；极简随笔/禅意/文学类可省略。如果需要目录，选择一个明确的布局方向（横向卡片滚动 或 竖向列表），禁止在同一次生成中使用两种。这个决策必须在设计变量速查表中以 `TOC: 横向卡片 | 竖向列表 | 无` 的形式明确记录。\n" +
    "每个带图片槽位的组件都提供纯文字版变体。\n\n" +
    "### 3. 完整文章模板骨架\n" +
    "用 ` ```html ` 围栏展示从封面→（如有目录，紧跟封面后）→各章节→结尾的完整装配顺序。目录如果存在，必须放在封面之后、第一个章节标题之前，禁止放在标题/封面前面。\n\n" +
    "### 4. 文章类型 → 组件组合配方表\n" +
    "用 Markdown 表格列出：教程/测评/观点/复盘/随笔 等文章类型各用哪些核心组件。配方表中必须明确列出目录组件（如果有的话），如果设计变量表中 TOC 为「无」，所有配方行中都不出现目录组件。\n\n" +
    "### 5. Markdown → 组件映射规则表\n" +
    "用 Markdown 表格列出：`# 标题`/`## 章节`/`**加粗**`/`> 引用`/`- 列表`/`![]()` 等 Markdown 语法各映射到哪些组件。\n\n" +
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
