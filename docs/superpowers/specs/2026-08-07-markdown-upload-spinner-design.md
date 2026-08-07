# Markdown 编辑器图片上传光标处加载指示 - 设计

日期：2026-08-07

## 目标

Markdown 编辑器（textarea）上传图片时，在上传发起时的光标位置显示浮动转圈，让用户明确感知图片将插入的位置；上传完成后转圈消失并在原光标处插入 `![](url)`，失败则转圈消失并提示。

## 方案

textarea 无法内嵌图形元素，采用浮动层方案：

1. 上传开始时保存 `selectionStart`（现有逻辑），用"镜像 div"技术计算该位置在 textarea 中的坐标（复制 textarea 的字体/内边距/换行等样式，把光标前文本放入隐藏 div 测量）
2. 在 textarea 外层容器（`position:relative`）中绝对定位一个转圈气泡（主题色 spinner + "上传中"小字），`pointer-events:none` 不干扰输入
3. 转圈固定在发起位置；监听 textarea `scroll`，位置随内容滚动同步（`top = 测量值 - scrollTop`）
4. 上传成功/失败时清除转圈（沿用现有 `mdUploading` 状态与回调）

## 涉及文件

- 修改：`src/components/layout/MiddlePanel.tsx`（新增坐标计算函数、spinner 状态与渲染、滚动同步）

## 验证

- `npm run lint` / `npm run build` 通过
- headless 浏览器验证：触发上传后光标行出现转圈；滚动后位置跟随；失败后消失
