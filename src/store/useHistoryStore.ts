import { create } from 'zustand'
import type { HistoryRecord } from '../types'
import { getAllHistory, addHistory, deleteHistory, clearAllHistory, getHistoryCount } from '../lib/storage/history'

interface HistoryState {
  records: HistoryRecord[]
  loaded: boolean
  loadRecords: () => Promise<void>
  addRecord: (record: Omit<HistoryRecord, 'id' | 'createdAt'>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  getCount: () => Promise<number>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  records: [],
  loaded: false,

  loadRecords: async () => {
    const records = await getAllHistory()
    set({ records, loaded: true })
  },

  addRecord: async (record) => {
    const saved = await addHistory(record)
    set((state) => ({
      records: [saved, ...state.records],
    }))
  },

  deleteRecord: async (id) => {
    await deleteHistory(id)
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }))
  },

  clearAll: async () => {
    await clearAllHistory()
    set({ records: [] })
  },

  getCount: async () => {
    return getHistoryCount()
  },
}))
