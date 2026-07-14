# 项目记忆

## 项目：WX-TypeSeting 公众号排版工作台

### 核心信息
- 基于 gzh-design 技能构建的 Web 排版工具
- 技术栈：React 18 + TypeScript + Vite + TailwindCSS + TipTap + Zustand + Dexie.js
- 四面板布局：上(主题卡片+设置) / 左(富文本/Markdown) / 中(Markdown) / 右(预览)
- 6 个内置主题：摸鱼绿/红白色系/石墨极简风/留白禅意风/摸鱼票据风/橄榄手记
- LLM 供应商：DeepSeek(已实现) + OpenAI/通义千问/月之暗面(预留)
- 本地存储：IndexedDB(文章/主题) + localStorage(API Key 加密)
- 合规校验：JS 移植 validate_gzh_html.py
- 主题文件在 public/themes/，运行时 fetch 加载

### 用户偏好
- 文章数据全部本地存储，不上服务器
- API Key 简单加密（AES + 浏览器指纹）
- 参考图生成主题需 Vision 模型（接口已预留）
- 网站布局可一键切换 6 种主题风格
