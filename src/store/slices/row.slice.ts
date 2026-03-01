// Row slice — row tool ayarları ve row'a özgü toplu güncelleme action'ları
// updateRowLabeling: labeling alanı değişince seat label'larını otomatik yeniden hesaplar
// assignCategoryToSeats: seçili seat'lere kategori ekler veya çıkarır

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { Row, Seat } from '../types'
import { DEFAULT_ROW_SPACING, DEFAULT_SEAT_SPACING } from '@/lib/constants'
import { computeSeatLabels } from '@/lib/seat-labeling'
import { nanoid } from 'nanoid'

export interface RowToolSettings {
  seatSpacing: number
  rowSpacing:  number
}

export interface RowSlice {
  // State
  rowToolSettings: RowToolSettings

  // Actions
  setRowToolSettings:    (patch: Partial<RowToolSettings>) => void
  updateRowLabeling:     (rowId: string, patch: Partial<Pick<Row,
    'seatLabelingMode' | 'seatLabelStartAt' | 'seatLabelDirection' |
    'sectionLabel' | 'rowLabel' | 'rowLabelPosition' | 'rowLabelDirection'
  >>) => void
  updateRows:            (rowIds: string[], patch: Partial<Row>) => void
  assignCategoryToSeats: (seatIds: string[], categoryId: string, remove?: boolean) => void
}

export const createRowSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  RowSlice
> = (set, get) => ({

  rowToolSettings: {
    seatSpacing: DEFAULT_SEAT_SPACING,
    rowSpacing:  DEFAULT_ROW_SPACING,
  },

  setRowToolSettings: (patch) => {
    set((state) => {
      state.rowToolSettings = { ...state.rowToolSettings, ...patch }
    })
  },

  // Labeling alanlarını güncelle ve seat label'larını otomatik yeniden hesapla
  updateRowLabeling: (rowId, patch) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      const obj = floor.objects.find((o) => o.id === rowId)
      if (!obj || obj.type !== 'row') return

      const row = obj as Row
      Object.assign(row, patch)

      // Seat label'larını yeniden hesapla
      const newLabels = computeSeatLabels(
        row.seats.length,
        row.seatLabelingMode,
        row.seatLabelStartAt,
        row.seatLabelDirection,
      )
      row.seats.forEach((seat, i) => {
        seat.label = newLabels[i] ?? String(i + 1)
      })

      state.chart!.updatedAt = new Date()
    })
  },

  // Aynı patch'i birden fazla row'a uygular — çoklu seçim için
  updateRows: (rowIds, patch) => {
    if (rowIds.length === 0) return
    get().pushHistory()

    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      const rowIdSet = new Set(rowIds)

      for (const obj of floor.objects) {
        if (obj.type !== 'row' || !rowIdSet.has(obj.id)) continue
        const row = obj as Row
        Object.assign(row, patch)

        // Labeling alanı değiştiyse seat label'larını yeniden hesapla
        const labelingChanged =
          'seatLabelingMode'   in patch ||
          'seatLabelStartAt'   in patch ||
          'seatLabelDirection' in patch

        if (labelingChanged) {
          const newLabels = computeSeatLabels(
            row.seats.length,
            row.seatLabelingMode,
            row.seatLabelStartAt,
            row.seatLabelDirection,
          )
          row.seats.forEach((seat, i) => {
            seat.label = newLabels[i] ?? String(i + 1)
          })
        }
      }

      state.chart!.updatedAt = new Date()
    })
  },

  // Seçili koltuk ID'lerine kategori ekle veya çıkar
  assignCategoryToSeats: (seatIds, categoryId, remove = false) => {
    if (seatIds.length === 0) return
    get().pushHistory()

    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      const seatSet = new Set(seatIds)

      for (const obj of floor.objects) {
        if (obj.type !== 'row') continue
        const row = obj as Row
        for (const seat of row.seats) {
          if (!seatSet.has(seat.id)) continue
          if (remove) {
            seat.categoryIds = seat.categoryIds.filter((id) => id !== categoryId)
          } else if (!seat.categoryIds.includes(categoryId)) {
            seat.categoryIds.push(categoryId)
          }
        }
      }

      state.chart.updatedAt = new Date()
    })
  },
})