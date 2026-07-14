import type { ThemeMeta } from '../types'
import { getCustomThemeByFile } from '../storage/customThemes'

export const BUILTIN_THEMES: ThemeMeta[] = [
  {
    id: 'moyu-green',
    name: '摸鱼绿',
    color: '#059669',
    scene: '教程、测评、清单、工具盘点',
    underlineCss: 'border-bottom:2px solid #A7F3D0;font-weight:600;',
    componentFile: 'theme-moyu-green.md',
    isBuiltin: true,
    isDefault: true,
  },
  {
    id: 'red-white',
    name: '红白色系',
    color: '#DC2626',
    scene: '深度分析、观点、力量感话题',
    underlineCss: 'border-bottom:2px solid #FECACA;font-weight:600;',
    componentFile: 'theme-red-white.md',
    isBuiltin: true,
  },
  {
    id: 'graphite-minimal',
    name: '石墨极简风',
    color: '#52525B',
    scene: '设计、科技评论、专业观点',
    underlineCss: 'border-bottom:2px solid #52525B;font-weight:600;',
    componentFile: 'theme-graphite-minimal.md',
    isBuiltin: true,
  },
  {
    id: 'zen-whitespace',
    name: '留白禅意风',
    color: '#4A5D52',
    scene: '禅意冥想、极简生活、深度随笔',
    underlineCss: 'border-bottom:1.5px solid #B5C8BC;font-weight:500;',
    componentFile: 'theme-zen-whitespace.md',
    isBuiltin: true,
  },
  {
    id: 'moyu-ticket',
    name: '摸鱼票据风',
    color: '#059669',
    scene: '测评、工具对比、创意评测',
    underlineCss: 'border-bottom:2px solid #A7F3D0;font-weight:600;',
    componentFile: 'theme-moyu-ticket.md',
    isBuiltin: true,
  },
  {
    id: 'olive-journal',
    name: '橄榄手记',
    color: '#1e1f23',
    scene: '内刊手记、深度评测、案例复盘',
    underlineCss: 'border-bottom:2px solid #ed7b2f;font-weight:600;',
    componentFile: 'theme-olive-journal.md',
    isBuiltin: true,
  },
]

const themeFileCache: Record<string, string> = {}

export async function loadThemeComponentLibrary(fileName: string): Promise<string> {
  if (themeFileCache[fileName]) {
    return themeFileCache[fileName]
  }
  // 优先从 IndexedDB 查自定义主题
  const custom = await getCustomThemeByFile(fileName)
  if (custom) {
    themeFileCache[fileName] = custom
    return custom
  }
  // 回退到 fetch 加载内置主题
  const resp = await fetch(`/themes/${fileName}`)
  if (!resp.ok) {
    throw new Error(`Failed to load theme file: ${fileName}`)
  }
  const text = await resp.text()
  themeFileCache[fileName] = text
  return text
}

export async function loadCommonComponents(): Promise<string> {
  return loadThemeComponentLibrary('common-components.md')
}

export async function loadSkillInstructions(): Promise<string> {
  const raw = await loadThemeComponentLibrary('SKILL.md')
  // 去掉 YAML frontmatter（--- ... ---）
  const stripped = raw.replace(/^---[\s\S]*?---\n*/, '').trim()
  return stripped
}


export async function loadThemeGeneratorInstructions(): Promise<string> {
  return loadThemeComponentLibrary('theme-generator.md')
}
