import Dexie, { type Table } from 'dexie'
import type { Article, TypesetResult, CustomTheme, HistoryRecord } from '../../types'

export class AppDatabase extends Dexie {
  articles!: Table<Article, string>
  typesetResults!: Table<TypesetResult, string>
  customThemes!: Table<CustomTheme, string>
  history!: Table<HistoryRecord, string>

  constructor() {
    super('gzh-typeset-db')
    this.version(1).stores({
      articles: 'id, title, createdAt, updatedAt',
      typesetResults: 'id, articleId, themeId, createdAt',
      customThemes: 'id, name, createdAt',
    })
    this.version(2).stores({
      history: 'id, title, createdAt',
    })
  }
}

export const db = new AppDatabase()
