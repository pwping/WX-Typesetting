# 富文本图片选中高亮 - 设计

日期：2026-08-07

## 目标

富文本编辑器中的图片被点击选中时，显示主题色高亮边框，明确选中状态；取消选择后自动消失。

## 方案

实现由两部分组成：

- ProseMirror 对选中节点（NodeSelection）会自动添加 `.ProseMirror-selectednode` 类，包括默认渲染的 `<img>` 元素
- Tiptap 3 的 image 节点不是 atom，ProseMirror 单击不会自动创建 NodeSelection（普通单击只对 atom 节点自动选中）。因此在 `RichTextEditor.tsx` 的 `editorProps.handleClick` 中，点击图片时通过 `posAtCoords` 定位 image 节点并手动创建 NodeSelection，然后返回 `true`
- 在 `src/styles/index.css` 中新增一条规则：

```css
.ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--app-accent-light);
}
```

- 颜色跟随 6 套 UI 主题（`--app-accent` / `--app-accent-light`）
- 使用 `outline` 不影响布局；`box-shadow` 柔和光晕

## 范围

- 仅富文本编辑器内图片的选中态
- 不修改 Markdown 编辑器、上传流程、公众号输出链路

## 验证

- 浏览器中插入图片并点击：`<img>` 获得 `.ProseMirror-selectednode`，呈现主题色边框
- 点击编辑区空白处：边框消失
- 主题切换后边框颜色跟随变化
- `npm run lint` / `npm run build` 通过

## 涉及文件

- 修改：`src/components/editor/RichTextEditor.tsx`（新增 handleClick 选中逻辑）
- 修改：`src/styles/index.css`（新增 1 条规则）
