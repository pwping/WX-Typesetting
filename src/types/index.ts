export interface ThemeMeta {
  id: string
  name: string
  color: string
  scene: string
  underlineCss: string
  componentFile: string
  isBuiltin: boolean
  isDefault?: boolean
}

export interface Article {
  id: string
  title: string
  richTextHtml: string
  markdown: string
  createdAt: number
  updatedAt: number
}

export interface TypesetResult {
  id: string
  articleId: string
  themeId: string
  html: string
  validationPassed: boolean
  errors: string[]
  warnings: string[]
  createdAt: number
}

export type ApiProtocol = 'openai' | 'anthropic'

export interface ApiKeyConfig {
  protocol: ApiProtocol
  baseUrl: string
  modelId: string
  apiKey: string
}

export interface CustomTheme extends ThemeMeta {
  componentLibrary: string
  previewHtml?: string
  description?: string
  createdAt: number
}

export interface ValidationIssue {
  level: 'ERROR' | 'WARNING'
  message: string
  count?: number
}

export interface ValidationResult {
  passed: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  spanLeafCount: number
}

export type EditorMode = 'richtext' | 'markdown'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'


export interface HistoryRecord {
  id: string
  title: string
  html: string
  themeId: string
  themeName: string
  themeColor: string
  createdAt: number
}
