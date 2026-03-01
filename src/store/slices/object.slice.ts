// Object slice — canvas nesne CRUD işlemleri (Row, Table, Booth vb.)
// Tüm mutasyonlar activeFloorId üzerinden çalışır
// addObject: editing context aktifse otomatik section.objectIds'e ekler

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { ChartObject, Floor } from '../types'

export interface ObjectSlice {
  addObject:             (object: ChartObject) => void
  updateObject:          (id: string, updates: Partial<ChartObject>) => void
  removeObject:          (id: string) => void
  removeSelectedObjects: () => void
}

export const createObjectSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  ObjectSlice
> = (set, get) => ({

  addObject: (object) => {
    get().pushHistory()
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      floor.objects.push(object as Floor['objects'][number])

      // Editing context aktifse — nesneyi o section'a otomatik bağla
      if (state.editingContext?.type === 'section') {
        const section = floor.sections.find((s) => s.id === state.editingContext!.sectionId)
        if (section && !section.objectIds.includes(object.id)) {
          section.objectIds.push(object.id)
        }
      }

      state.chart.updatedAt = new Date()
    })
  },

  updateObject: (id, updates) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const index = floor.objects.findIndex((o) => o.id === id)
      if (index !== -1) {
        floor.objects[index] = {
          ...floor.objects[index],
          ...updates,
        } as Floor['objects'][number]
        state.chart.updatedAt = new Date()
      }
    })
  },

  removeObject: (id) => {
    get().pushHistory()
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      floor.objects = floor.objects.filter((o) => o.id !== id)

      // Section bağını da temizle
      for (const section of floor.sections) {
        section.objectIds = section.objectIds.filter((oid) => oid !== id)
      }

      state.chart.updatedAt = new Date()
    })
  },

  removeSelectedObjects: () => {
    const { selectedObjectIds } = get()
    if (selectedObjectIds.length === 0) return
    get().pushHistory()

    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      floor.objects = floor.objects.filter((o) => !selectedObjectIds.includes(o.id))

      // Section bağlarını da temizle
      for (const section of floor.sections) {
        section.objectIds = section.objectIds.filter((oid) => !selectedObjectIds.includes(oid))
      }

      state.selectedObjectIds = []
      state.selectedSeatIds   = []
    })
  },
})