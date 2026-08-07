# 富文本编辑器图片上传占位指示 - 设计

日期：2026-08-07

## 目标

在左侧富文本编辑器上传图片时，于发起上传的光标位置插入一个"上传中"占位节点（转圈 + 文字），让用户明确感知图片将插入的位置；上传成功后占位替换为真实图片，失败则移除占位并提示。

## 范围

- 只做左侧富文本编辑器（Tiptap）。
- 不修改 Markdown 编辑器、不修改上传接口（ImgBB）、不修改公众号输出链路。

## 方案：自定义 Tiptap 占位节点（NodeView）

### 新增节点 `imageUpload`

- 位置：新建 `src/components/editor/ImageUploadExtension.tsx`
- 类型：`atom: true`、`group: 'block'`、`draggable: true`
- 属性：`uploadId: string`（唯一标识，用于上传完成后定位占位）
- 序列化：`<div data-upload-id="...">`（仅编辑器内部使用，不进入公众号输出；若输出时残留，由既有校验流程提示）
- 命令：`insertImageUpload(uploadId)` —— 在光标处插入占位节点
- NodeView 渲染：虚线边框容器（居中、浅色背景、约 150px 高）+ 居中 CSS 转圈（沿用现有 `animate-spin` SVG 样式）+ "图片上传中…" 小字，颜色跟随 `--app-*` 主题变量

### Toolbar 流程改造（`src/components/editor/Toolbar.tsx`）

1. 选择文件后先生成 `uploadId`，调用 `insertImageUpload` 在光标处插入占位
2. 调用现有 `uploadImage()`
3. 成功回调：在文档中按 `uploadId` 查找占位节点
   - 找到：`replaceWith` 替换为 `image` 节点（src=真实 URL），光标移到图片后
   - 未找到（用户已撤销/删除占位）：不插入图片，静默结束
4. 失败回调：找到占位则删除，随后 `alert(msg)`（保持现有提示行为）

### 交互约束

- 上传期间用户仍可编辑其他位置，占位节点位置固定
- 一次只上传一个文件（沿用现有 `uploading` 禁用按钮逻辑）
- 上传完成前按撤销会删除占位，上传完成后不再插入图片（合理、可预期）

## 验证

- `npm run lint`、`npm run build` 通过
- 手动验证（dev server + 真实/无效 ImgBB Key）：
  1. 上传中：光标处出现转圈占位，可继续编辑其他区域
  2. 成功：占位原地变为图片
  3. 失败：占位消失并弹出提示
  4. 上传中撤销：完成后不插入图片

## 涉及文件

- 新增：`src/components/editor/ImageUploadExtension.tsx`
- 修改：`src/components/editor/RichTextEditor.tsx`（注册扩展）
- 修改：`src/components/editor/Toolbar.tsx`（插入占位 / 成功替换 / 失败删除）
