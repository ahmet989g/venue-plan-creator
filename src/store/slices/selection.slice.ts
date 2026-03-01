// Selection slice — seçili obje ve koltuk ID listesi yönetimi
// selectObjects çağrılınca selectedSeatIds temizlenir (farklı seçim tipi)

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'

export interface SelectionSlice {
  // State
  selectedObjectIds: string[]
  selectedSeatIds:   string[]

  // Actions
  selectObjects:  (ids: string[]) => void
  selectSeats:    (ids: string[]) => void
  clearSelection: () => void
}

export const createSelectionSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  SelectionSlice
> = (set) => ({
  selectedObjectIds: [],
  selectedSeatIds:   [],

  selectObjects: (ids) => {
    set((state) => {
      state.selectedObjectIds = ids
      state.selectedSeatIds   = []
    })
  },

  selectSeats: (ids) => {
    set((state) => {
      state.selectedSeatIds = ids
    })
  },

  clearSelection: () => {
    set((state) => {
      state.selectedObjectIds = []
      state.selectedSeatIds   = []
    })
  },
})