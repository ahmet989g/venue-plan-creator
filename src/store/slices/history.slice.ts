// History slice — undo/redo stack ve publish action'ı
// pushHistory her mutasyondan önce çağrılır, snapshot alınır
// MAX_HISTORY_SIZE aşılınca en eski snapshot silinir

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { VenueChart } from '../types'
import { MAX_HISTORY_SIZE } from '@/lib/constants'

export interface HistorySlice {
  // State
  history:      VenueChart[]
  historyIndex: number

  // Actions
  pushHistory: () => void
  undo:        () => void
  redo:        () => void
  publish:     () => void
}

// Güvenli derin kopya — Date nesnelerini de korur
export const deepClone = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T

export const createHistorySlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  HistorySlice
> = (set, get) => ({
  history:      [],
  historyIndex: -1,

  pushHistory: () => {
    const { chart, history, historyIndex } = get()
    if (!chart) return

    const snapshot   = deepClone(chart)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)

    if (newHistory.length > MAX_HISTORY_SIZE) newHistory.shift()

    set((state) => {
      state.history      = newHistory
      state.historyIndex = newHistory.length - 1
    })
  },

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex <= 0) return

    const target = history[historyIndex - 1]
    set((state) => {
      state.chart             = deepClone(target)
      state.historyIndex      = historyIndex - 1
      state.selectedObjectIds = []
      state.selectedSeatIds   = []
    })
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return

    const target = history[historyIndex + 1]
    set((state) => {
      state.chart        = deepClone(target)
      state.historyIndex = historyIndex + 1
    })
  },

  // TODO: Gerçek publish endpoint'i eklenecek
  publish: () => {
    const { chart } = get()
    if (!chart) return
    console.log('[Venue Plan Creator] Published Chart:', JSON.stringify(chart, null, 2))
  },
})