# 公众号排版工作台 - 项目概览

## 完成内容

基于 `gzh-design` 技能构建的 Web 排版工具面板，完整整合了技能的 6 个主题和排版流程。

### 四面板布局
- **顶部**：6 个主题卡片（可点击选择）+ 自定义主题入口 + API 配置 + 网站 UI 换肤
- **左栏**：TipTap 富文本编辑器（B/I/U/H1-3/列表/引用/代码块/链接/图片）+ Markdown 模式切换
- **中栏**：Markdown 编辑器 + 一键从左栏转换 + Token 估算 + 排版渲染按钮
- **右栏**：iframe 实时预览 + 合规校验状态 + 一键复制到公众号 + 下载 HTML

### 核心功能
1. **LLM 智能排版**：调用 DeepSeek API，发送文章 + 主题组件库 + 排版指令，流式返回公众号 HTML
2. **6 套主题**：从 gzh-design 技能提取，运行时加载组件库 markdown 文件
3. **浏览器端校验**：JS 移植 validate_gzh_html.py，检查禁用标签/span leaf 包裹/半角标点
4. **本地存储**：IndexedDB 存文章/草稿/自定义主题/排版历史，localStorage 加密存 API Key
5. **自定义主题**：文字描述或参考图生成（Vision 接口预留）
6. **模型供应商抽象**：DeepSeek 已实现，OpenAI/通义千问/月之暗面预留
7. **网站换肤**：6 套 CSS 变量，一键切换整个应用 UI 风格
8. **剪贴板复制**：execCommand 复制渲染后的富文本到公众号编辑器

### 技术栈
- React 18 + TypeScript + Vite
- TailwindCSS（CSS 变量主题系统）
- TipTap（ProseMirror 富文本）
- Zustand（状态管理）
- Dexie.js（IndexedDB）
- Turndown.js（HTML→Markdown）

### 使用流程
1. 在顶部选择主题（或配置 API Key 后生成自定义主题）
2. 在左栏输入文章（富文本或 Markdown 模式）
3. 中栏点击「从左栏转换」转为 Markdown（或直接编辑）
4. 点击「排版渲染」调用 LLM 生成公众号 HTML
5. 右栏查看预览，校验通过后点「复制到公众号」
6. 到公众号编辑器 Ctrl+V 粘贴即可
