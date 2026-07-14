import { db } from './db'
import type { CustomTheme } from '../../types'

function generateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 从中文主题名生成英文标识，如 "天空蓝" → "sky-blue" */
export function themeNameToFileId(name: string): string {
  // 简单拼音映射常用词，其余用时间戳
  const map: Record<string, string> = {
    '红': 'red', '橙': 'orange', '黄': 'yellow', '绿': 'green', '青': 'cyan',
    '蓝': 'blue', '紫': 'purple', '黑': 'black', '白': 'white', '灰': 'gray',
    '金': 'gold', '银': 'silver', '粉': 'pink', '棕': 'brown',
  }
  let id = ''
  for (const ch of name) {
    if (map[ch]) { id += (id ? '-' : '') + map[ch] }
  }
  if (!id) id = 'custom'
  return `theme-${id}-${Date.now().toString(36).slice(-4)}`
}

export async function saveCustomTheme(
  theme: Omit<CustomTheme, 'id' | 'isBuiltin' | 'createdAt'>,
): Promise<CustomTheme> {
  const id = theme.componentFile
    ? theme.componentFile.replace(/^theme-/, '').replace(/\.md$/, '')
    : generateId().replace('custom_', '')
  const full: CustomTheme = {
    ...theme,
    id,
    isBuiltin: false,
    createdAt: Date.now(),
    // 确保 componentFile 格式正确
    componentFile: theme.componentFile || `theme-${id}.md`,
    // 确保 componentLibrary 有值（兼容旧数据）
    componentLibrary: theme.componentLibrary || '',
  }
  await db.customThemes.add(full)
  return full
}

export async function getCustomThemes(): Promise<CustomTheme[]> {
  return db.customThemes.orderBy('createdAt').reverse().toArray()
}

export async function deleteCustomTheme(id: string): Promise<void> {
  await db.customThemes.delete(id)
}

export async function getCustomTheme(id: string): Promise<CustomTheme | undefined> {
  return db.customThemes.get(id)
}

/** 通过 componentFile 文件名查找自定义主题的 markdown 内容 */
export async function getCustomThemeByFile(componentFile: string): Promise<string | null> {
  const all = await db.customThemes.toArray()
  const found = all.find((t) => t.componentFile === componentFile)
  return found && found.componentLibrary ? found.componentLibrary : null
}
