// Chart slice — VenueChart meta verisi ve floor yönetimi
// initChart ile yeni plan başlatılır, floor CRUD burada yaşar

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { VenueChart, VenueType, Floor, Viewport } from '../types'
import { nanoid } from 'nanoid'

export interface ChartSlice {
  // State
  chart:         VenueChart | null
  activeFloorId: string | null

  // Actions
  initChart:      (venueType: VenueType) => void
  setChartName:   (name: string) => void
  addFloor:       () => void
  setActiveFloor: (floorId: string) => void
  removeFloor:    (floorId: string) => void
  renameFloor:    (floorId: string, label: string) => void
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 }

export const createDefaultFloor = (order: number): Floor => ({
  id:           nanoid(),
  label:        order === 0 ? 'Ground Floor' : `Floor ${order + 1}`,
  order,
  sections:     [],
  objects:      [],
  lastViewport: { ...DEFAULT_VIEWPORT },
})

export const createChartSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  ChartSlice
> = (set, get) => ({
  chart:         null,
  activeFloorId: null,

  initChart: (venueType) => {
    const firstFloor = createDefaultFloor(0)
    const now        = new Date()

    set((state) => {
      state.chart = {
        id:         nanoid(),
        name:       'Untitled Plan',
        venueType,
        floors:     [firstFloor],
        categories: [],
        origin:     { x: 0, y: 0 },
        createdAt:  now,
        updatedAt:  now,
      }
      state.activeFloorId  = firstFloor.id
      state.history        = []
      state.historyIndex   = -1
    })
  },

  setChartName: (name) => {
    set((state) => {
      if (!state.chart) return
      state.chart.name      = name
      state.chart.updatedAt = new Date()
    })
  },

  addFloor: () => {
    set((state) => {
      if (!state.chart) return
      const order    = state.chart.floors.length
      const newFloor = createDefaultFloor(order)
      state.chart.floors.push(newFloor)
      state.activeFloorId = newFloor.id
    })
  },

  setActiveFloor: (floorId) => {
    const { chart, viewport, activeFloorId } = get()
    if (!chart) return

    set((state) => {
      if (!state.chart) return

      // Mevcut floor viewport'unu kaydet
      const current = state.chart.floors.find((f) => f.id === activeFloorId)
      if (current) current.lastViewport = { ...viewport }

      state.activeFloorId = floorId

      // Hedef floor'un son viewport'una geç
      const target = state.chart.floors.find((f) => f.id === floorId)
      if (target?.lastViewport) state.viewport = { ...target.lastViewport }
    })
  },

  removeFloor: (floorId) => {
    set((state) => {
      if (!state.chart || state.chart.floors.length <= 1) return
      state.chart.floors = state.chart.floors.filter((f) => f.id !== floorId)
      if (state.activeFloorId === floorId) {
        state.activeFloorId = state.chart.floors[0]?.id ?? null
      }
    })
  },

  renameFloor: (floorId, label) => {
    set((state) => {
      if (!state.chart) return
      const floor = state.chart.floors.find((f) => f.id === floorId)
      if (floor) floor.label = label
    })
  },
})