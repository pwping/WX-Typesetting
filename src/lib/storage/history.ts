import { db } from './db'
import type { HistoryRecord } from '../../types'

export async function getAllHistory(): Promise<HistoryRecord[]> {
  return db.history.orderBy('createdAt').reverse().toArray()
}

export async function addHistory(
  record: Omit<HistoryRecord, 'id' | 'createdAt'>,
): Promise<HistoryRecord> {
  const full: HistoryRecord = {
    ...record,
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }
  await db.history.add(full)
  return full
}

export async function deleteHistory(id: string): Promise<void> {
  await db.history.delete(id)
}

export async function clearAllHistory(): Promise<void> {
  await db.history.clear()
}

export async function getHistoryCount(): Promise<number> {
  return db.history.count()
}
