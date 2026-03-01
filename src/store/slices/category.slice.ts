// Category slice — kategori CRUD ve dnd-kit sıralama yönetimi
// removeCategory: chart'taki tüm seat referanslarını da temizler

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { Category, Row } from '../types'
import { nanoid } from 'nanoid'

export interface CategorySlice {
  addCategory:       (label: string, color: string) => void
  updateCategory:    (id: string, updates: Partial<Category>) => void
  removeCategory:    (id: string) => void
  reorderCategories: (orderedIds: string[]) => void
}

export const createCategorySlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  CategorySlice
> = (set) => ({

  addCategory: (label, color) => {
    set((state) => {
      if (!state.chart) return
      const order = state.chart.categories.length
      state.chart.categories.push({
        id:           nanoid(),
        label,
        color,
        isWheelchair: false,
        order,
      })
    })
  },

  updateCategory: (id, updates) => {
    set((state) => {
      if (!state.chart) return
      const index = state.chart.categories.findIndex((c) => c.id === id)
      if (index !== -1) {
        state.chart.categories[index] = {
          ...state.chart.categories[index],
          ...updates,
        }
      }
    })
  },

  removeCategory: (id) => {
    set((state) => {
      if (!state.chart) return

      // Silinen kategoriye ait referansları tüm seat'lerden temizle
      for (const floor of state.chart.floors) {
        for (const obj of floor.objects) {
          if (obj.type !== 'row') continue
          const row = obj as Row
          for (const seat of row.seats) {
            seat.categoryIds = seat.categoryIds.filter((cId) => cId !== id)
          }
        }
      }

      state.chart.categories = state.chart.categories.filter((c) => c.id !== id)
    })
  },

  // dnd-kit sürükleme sonrası yeni sırayı uygula
  reorderCategories: (orderedIds) => {
    set((state) => {
      if (!state.chart) return
      const map = new Map(state.chart.categories.map((c) => [c.id, c]))
      state.chart.categories = orderedIds
        .map((id, index) => {
          const cat = map.get(id)
          if (!cat) return null
          return { ...cat, order: index }
        })
        .filter(Boolean) as Category[]
    })
  },
})