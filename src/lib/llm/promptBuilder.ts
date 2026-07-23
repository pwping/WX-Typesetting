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
    "**📌 标题引用铁律（所有主题通用）**：\n" +
    "  - 原文有 `# 标题` → **必须一字不差**用作文章封面标题，禁止自行总结或改写\n" +
    "  - 原文有 `## 章节标题` → **每一个**以 `## ` 开头的行都必须**一字不差**用作章节标题，并**必须使用主题组件库中的二级标题组件（如 chapter-title 章节标题、subtitle 小标题等专用于章节标题的组件）**进行渲染。**绝对禁止遗漏任何一个 `##` 标题**——无论标题是长是短、有没有特殊字符，**每个 `##` 标题都必须输出对应的 chapter-title 组件**。禁止用加粗段落、引用块、文字高亮、`**加粗**`、`==高亮==` 或其他任何非章节标题组件替代。`##` 后面一整行文字全部都是标题，不管这行里有什么标点符号（冒号、逗号、破折号等），都不能截断、不能行内拆分、不能用加粗文字代替。章节标题的标题文字与 Markdown 中 `##` 后面的文字必须**一字不差**\n" +
    "  - 原文没有 `# 标题` → 分析全文主题，自行总结一个合适的封面标题\n" +
    "  - 原文没有 `## 章节标题` → 分析段落内容，为每段/每章概括一个合适的二级标题（此时可以自行总结）\n" +
    "  - 正文段落内容**必须严格保留原文措辞**，不得删改、不得增写、不得重新组织语言\n" +
    "  - **图片位置铁律（绝对禁止挪动图片）**：Markdown 中的 `![说明](url)` 图片标记，**必须严格保留它在原文中的位置**——紧跟在哪个段落/标题/引用之后，渲染时图片就放在哪个位置。**绝对禁止把图片前移或后移到其他章节**，**也禁止把多张图片合并/重组到一起**。例如原文是「标题 → 图1 → 段落A → 段落B → 图2」，渲染后必须保持同样的顺序：标题、图1、段落A、段落B、图2，不能把图1 移到图2 后面\n\n" +
    "**⚠️ 目录组件铁律**：\n" +
    "  - **章节识别规则**：只有 `## ` 开头的行才是章节标题。正文中出现的「PART 01」「01」「CHAPTER 1」等纯文字内容（不包含 `## ` 前缀）不属于章节，不要将其识别为标题\n" +
    "  - **只生成一份目录**：全文最多只有一个目录/导读组件，禁止在文章的多个位置生成多份目录\n" +
    "  - 如果主题组件库中包含目录/导读/本文看点组件，则严格按照该组件的 HTML 结构（包括容器样式、颜色、排列方式、布局方向）进行渲染。**禁止自创目录样式、禁止改变目录的布局方式**。目录的显示方式（横向卡片滚动 or 竖向列表排列）由主题组件库中的目录组件 HTML 决定，你只负责按该样式填充内容，不得自行决定或改变\n" +
    "  - **目录卡片必须保持固定的宽度和高度**（即 flex-shrink:0 + 固定的 width/min-width），不要因为标题文字长短而改变卡片尺寸。**目录标题文字力求简短精炼，控制在卡片宽度能容纳的字数内**，避免文字过长溢出\n" +
    "  - 目录项数量必须与 ## 章节数量完全一致，有几个章节就显示几个，不得精选、不得跳过、不得省略任何章节。目录中的每个标题文字必须与下方 ## 章节标题完全一样，不得改写、不得缩写。目录项顺序必须与 ## 章节出现顺序完全一致。每个目录项的内容（标题文字）必须根据 ## 章节内容动态生成，不能只复制主题模板中的示例文字。目录卡片上的标题文字必须与对应的 ## 章节标题一字不差\n" +
    "  - 如果主题组件库中没有目录组件，则跳过目录，直接从封面进入正文\n\n" +
    "**⚠️ 占位素材铁律**：原文中出现的以下占位标记，必须使用通用组件库中的 **2c 待补素材占位板块**（浅底柔虚线框 + 居中图标与说明）进行渲染，禁止用普通段落、引用块、左对齐提示或其他任何非 2c 的方式处理——2c 是唯一正确的占位组件，无论使用哪个主题都必须遵守：\n" +
    "- `【插入图片】`、`【插入视频】`、`【插入GIF】`、`【插入录屏】`、`【插入音频】`、`【插入xxx】` 等所有以 `【插入` 开头的标记\n" +
    "- `【配图：…】`、`【配图】` 等 PDF/格式转换产生的配图占位\n" +
    "- `[图表待补]`、`[图片待补]`、`[待录屏]`、`[待补GIF]` 等以 `[待` 或 `[图` 开头的方括号占位\n" +
    "- **位置必须与原文完全一致**：占位符在 Markdown 原文中的哪一段、哪一行出现，渲染后的 2c 组件就放在哪一段、哪一行，禁止将占位符移动到文章开头/结尾/其他位置\n\n" +
    "**📏 排版统一规则（所有主题通用）**：\n" +
    "  - **正文段落中的 font-size 统一为 15px**，不得使用 14px 或其他字号。如果主题组件库中的正文段落写死了其他字号，以本条规则为准进行覆盖\n" +
    "  - **二级标题（## 章节标题）**：" + (theme.isBuiltin ? "" : "字号统一为 18px，") + "以主题组件库中章节标题的定义为准\n" +
    "  - **内容区左右边距分两类**（避免封面/头图等大块背景组件溢出）：\n" +
    "    - **内部组件**（章节标题、目录、章节内容、正文段落、引用块、代码块、图片、表格、卡片、列表等）使用 **8px**（`padding:0 8px` 或 `margin:0 8px`）\n" +
    "    - **外部大块组件**（封面/头图、尾图、签名区、结尾互动区 footer-cta 等带背景色块撑满整个内容宽度的组件）使用 **10px**（`padding:0 10px` 或 `margin:0 10px`），避免因为内容撑满加上边距导致右侧溢出\n\n" +
"**🚨 输出格式铁律（这是最常出错的环节，必须严格遵守）**：\n" +
    "1. **你只能输出一段纯 HTML 源码**，从第一个字符到最后一个字符全部都是 HTML，**绝对禁止输出任何其他内容**\n" +
    "2. **绝对禁止输出你的思考过程、检查清单、状态总结、自我对话**——比如「让我检查一下」「我需要运行脚本」「所有文字节点都已包裹」「头图卡中的 [...] 用了 ✓」「列表项内部有...」这类内心独白/校验过程/勾选状态，**一个字都不能写进输出里**。这些只是给你自己看的（并且你也不需要真的写出来），**输出里完全不需要**\n" +
    "3. 禁止任何前缀文字（不要写「以下是」「输出如下」）、后缀说明（不要写「完成」「结束」）、代码围栏标记（`）、Markdown 包裹、解释性文案\n" +
    "4. 禁止使用省略号 `…` 或 `...` 截断、检查过程、过渡语句\n" +
    "5. 输出必须以 `<section` 开头，以 `</section>` 结尾，**首尾直接是 HTML 标签，中间无任何非 HTML 内容**\n" +
    "6. 如果输出不符合以上任何一条，整篇文章都不可用\n\n" +
    "**📋 内部合规要求（这是给你自己看的，输出里不要体现这些检查动作）**：\n" +
    "1. 所有文字节点都必须用 `<span leaf=\"\">文字</span>` 包裹\n" +
    "2. 日期必须用 `{{日期}}` / `{{月份}}` 占位，不能写死\n" +
    "3. 代码块必须用通用组件库的 1a 模板（每行一个 `<p style=\"margin:0\">`），禁止 `<pre>` / `white-space:pre`\n" +
    "4. 行内代码必须用 1c 模板\n" +
    "5. 正文段落 font-size 统一为 15px\n" +
    "6. `##` 二级标题必须用主题库里的 chapter-title 等章节标题组件渲染，**禁止用 `**加粗**` 替代**\n" +
    "7. **加粗/下划线微信安全规则**：`**加粗**`必须渲染为 `<span style=\"font-weight:700;\"><span leaf=\"\">加粗</span></span>`；下划线标记（Markdown 无原生语法，用 `<u>` 标识）必须渲染为 `<span style=\"border-bottom:2px solid 主题主色;font-weight:600;\"><span leaf=\"\">文字</span></span>`。禁止使用 `text-decoration:underline`（微信会丢失）\n" +
    "8. HTML 最后必须在所有组件闭合后添加一个空段落：`<p style='margin:0;'><span leaf=''><br></span></p>`，确保在公众号编辑器末尾有一个可点击输入的空白行，方便继续添加内容\n" +
    "9. **章节编号严格按 `##` 出现顺序连续递增**（01/02/03…），不得跳号、不得根据章节内容字面意思判断末章。末章编号变体（`///`、`∞`、`LAST`）**只能用于 Markdown 中实际最后一个 `##` 标题**——即使某章标题含「结语/总结/写在最后」字眼，只要后面还有其他 `##` 标题，就只能使用数字编号\n" +
    "10. **每个 `##` 标题都是独立章节**：禁止合并相邻的 `##` 标题，禁止省略任何一个 `##` 标题。`## 数据` 和 `## 隐私` 必须保留为两个独立章节，不能合并成「数据隐私」" +
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
    "用 ` ``` ` 代码围栏列出：主色调 / 辅色 / 标题色 / 正文色 / 次要文字 / 注释色 / 分割线色 / 浅底 / 浅边框 / 字号(正文必须15px) / 行高 / 间距 / max-width(677px) / 内容区边距(padding:0 8px)。\n\n" +
    "**🔴 正文字号铁律**：所有正文段落组件的 `font-size` 必须为 `15px`，不得使用其他字号（14px/16px/17px 等）。章节标题、引用块、卡片等非正文组件可用更大字号（最大 24px），但正文段落统一为 15px。在设计变量表中的「字号」项必须写 `正文15px`。\n" +
    "**🔴 章节标题字号铁律**：所有 `##` 二级章节标题组件的 `font-size` 必须为 `18px`，不得使用 17px/20px/22px 等其他字号。三级子标题可用 16px，但二级标题统一为 18px。\n\n" +
    "### 2. 各组件完整 HTML\n" +
    "精选 20-35 个核心组件，按 `## 组件 N 组件名称` 编号，组件 1 为「全局容器」。每个组件放在 ` ```html ` 围栏内。\n" +
    "所有文字必须用 `<span leaf=\"\">文字</span>` 包裹，装饰空元素放 `<span leaf=\"\"><br></span>`。\n" +
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
