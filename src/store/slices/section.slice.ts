// Section slice — editing context geçişleri ve section CRUD
// enterSectionContext:     önceki viewport'u kaydeder, context'e girer
// exitSectionContext:      önceki viewport'a döner, context'i temizler
// addObjectToSection:      editing context'teyken eklenen nesneleri section'a bağlar
// removeObjectFromSection: nesne section'dan kaldırıldığında ilişkiyi temizler

import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.store'
import type { EditingContext, Section, SectionEdge, Point } from '../types'

// Her iki nokta arasının orta noktasını hesapla — default kontrol noktası
function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// Polygon noktalarından default edge dizisi oluştur
function buildDefaultEdges(points: Point[]): SectionEdge[] {
  return points.map((pt, i) => {
    const next = points[(i + 1) % points.length]
    const mid  = midpoint(pt, next)
    return { isCurved: false, cpx: mid.x, cpy: mid.y }
  })
}

export interface SectionSlice {
  // State
  editingContext: EditingContext

  // Editing context
  enterSectionContext:  (sectionId: string, floorId: string) => void
  exitSectionContext:   () => void

  // Section CRUD
  addSection:    (section: Section) => void
  updateSection: (id: string, patch: Partial<Section>) => void
  removeSection: (id: string) => void

  // Curve editing
  updateSectionEdge:  (sectionId: string, edgeIndex: number, patch: Partial<SectionEdge>) => void
  resetSectionEdges:  (sectionId: string) => void

  // Nesne ↔ Section ilişkisi
  addObjectToSection:      (sectionId: string, objectId: string) => void
  removeObjectFromSection: (sectionId: string, objectId: string) => void
}

export const createSectionSlice: StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  SectionSlice
> = (set, get) => ({

  editingContext: null,

  enterSectionContext: (sectionId, floorId) => {
    const { viewport } = get()
    set((state) => {
      state.editingContext = {
        type:             'section',
        sectionId,
        floorId,
        previousViewport: { ...viewport },
      }
    })
  },

  exitSectionContext: () => {
    // Viewport zoom-out animasyonu useSectionZoom hook'u tarafından yönetilir
    // Burada sadece state temizlenir; previousViewport'a geçiş hook'ta yapılır
    set((state) => {
      state.editingContext    = null
      state.selectedObjectIds = []
      state.selectedSeatIds   = []
    })
  },

  // ─── Curve Editing ───────────────────────────────────────────────────────

  updateSectionEdge: (sectionId, edgeIndex, patch) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const section = floor.sections.find((s) => s.id === sectionId)
      if (!section || !section.edges) return
      const edge = section.edges[edgeIndex]
      if (!edge) return
      section.edges[edgeIndex] = { ...edge, ...patch }
      state.chart.updatedAt = new Date()
    })
  },

  resetSectionEdges: (sectionId) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const section = floor.sections.find((s) => s.id === sectionId)
      if (!section || !section.points) return
      // Her edge'i düz çizgiye (isCurved=false) sıfırla, cp'yi edge ortasına al
      section.edges = buildDefaultEdges(section.points)
      state.chart.updatedAt = new Date()
    })
  },

  // ─── Section CRUD ─────────────────────────────────────────────────────────

  addSection: (section) => {
    get().pushHistory()
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (floor) {
        floor.sections.push(section)
        state.chart.updatedAt = new Date()
      }
    })
  },

  updateSection: (id, patch) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const index = floor.sections.findIndex((s) => s.id === id)
      if (index !== -1) {
        floor.sections[index] = { ...floor.sections[index], ...patch }
        state.chart.updatedAt = new Date()
      }
    })
  },

  // ─── Nesne ↔ Section İlişkisi ────────────────────────────────────────────

  addObjectToSection: (sectionId, objectId) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const section = floor.sections.find((s) => s.id === sectionId)
      if (!section) return
      // Duplicate kontrolü
      if (!section.objectIds.includes(objectId)) {
        section.objectIds.push(objectId)
      }
    })
  },

  removeObjectFromSection: (sectionId, objectId) => {
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return
      const section = floor.sections.find((s) => s.id === sectionId)
      if (!section) return
      section.objectIds = section.objectIds.filter((id) => id !== objectId)
    })
  },

  removeSection: (id) => {
    get().pushHistory()
    set((state) => {
      if (!state.chart || !state.activeFloorId) return
      const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
      if (!floor) return

      // Section silinince içindeki nesnelerin sectionId'sini null yap
      for (const obj of floor.objects) {
        if ('sectionId' in obj && obj.sectionId === id) {
          (obj as { sectionId: string | null }).sectionId = null
        }
      }

      floor.sections    = floor.sections.filter((s) => s.id !== id)
      state.chart.updatedAt = new Date()

      // Editing context bu section'a aitse temizle
      if (state.editingContext?.type === 'section' && state.editingContext.sectionId === id) {
        state.editingContext = null
      }
    })
  },
})