import { db } from './db'
import type { Article } from '../../types'

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function createArticle(title = '未命名文章'): Promise<Article> {
  const now = Date.now()
  const article: Article = {
    id: generateId(),
    title,
    richTextHtml: '',
    markdown: '',
    createdAt: now,
    updatedAt: now,
  }
  await db.articles.add(article)
  return article
}

export async function updateArticle(id: string, updates: Partial<Article>): Promise<void> {
  await db.articles.update(id, { ...updates, updatedAt: Date.now() })
}

export async function getArticle(id: string): Promise<Article | undefined> {
  return db.articles.get(id)
}

export async function getAllArticles(): Promise<Article[]> {
  return db.articles.orderBy('updatedAt').reverse().toArray()
}

export async function deleteArticle(id: string): Promise<void> {
  await db.transaction('rw', db.articles, db.typesetResults, async () => {
    await db.articles.delete(id)
    await db.typesetResults.where('articleId').equals(id).delete()
  })
}

export async function saveTypesetResult(result: TypesetResultData): Promise<string> {
  const id = `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await db.typesetResults.add({ ...result, id, createdAt: Date.now() })
  return id
}

export async function getTypesetResults(articleId: string): Promise<TypesetResult[]> {
  return db.typesetResults
    .where('articleId')
    .equals(articleId)
    .reverse()
    .sortBy('createdAt')
}

interface TypesetResultData {
  articleId: string
  themeId: string
  html: string
  validationPassed: boolean
  errors: string[]
  warnings: string[]
}
