// Venue Plan Creator — Zustand editor store
// Tüm canvas state, seçim, tool ve kategori yönetimi burada.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type {
  VenueChart,
  VenueType,
  ToolType,
  Category,
  Row,
  Seat,
  Floor,
} from './types'

// ---------------------------------------------------------------------------
// State tipi
// ---------------------------------------------------------------------------

interface EditorState {
  chart: VenueChart | null
  activeTool: ToolType
  activeFloorId: string | null
  selectedObjectIds: string[]   // Row / nesne id'leri
  selectedSeatIds: string[]     // Tek koltuk seçimi (Select Seats Tool)
  viewport: { x: number; y: number; scale: number }
}

// ---------------------------------------------------------------------------
// Actions tipi
// ---------------------------------------------------------------------------

interface EditorActions {
  // Temel
  initChart: (venueType: VenueType) => void
  setActiveTool: (tool: ToolType) => void

  // Seçim
  selectObjects: (ids: string[]) => void
  clearSelection: () => void

  // Row CRUD
  addRow: (row: Row) => void
  updateRow: (rowId: string, patch: Partial<Omit<Row, 'id' | 'type'>>) => void
  removeRows: (rowIds: string[]) => void

  // Koltuk güncelleme (tek veya çoklu)
  updateSeats: (
    seatIds: string[],
    patch: Partial<Pick<Seat, 'categoryIds' | 'accessible' | 'restrictedView' | 'label'>>,
  ) => void

  // Category CRUD
  addCategory: (label: string) => Category
  updateCategory: (categoryId: string, patch: Partial<Omit<Category, 'id'>>) => void
  removeCategory: (categoryId: string) => void
  reorderCategories: (orderedIds: string[]) => void

  // Seçili row'ların koltukları için kategori ata
  assignCategoryToSelectedRows: (categoryId: string) => void
  removeCategoryFromSelectedRows: (categoryId: string) => void
}

// ---------------------------------------------------------------------------
// Yardımcı — aktif floor
// ---------------------------------------------------------------------------

function getActiveFloor(state: EditorState): Floor | undefined {
  return state.chart?.floors.find((f) => f.id === state.activeFloorId) ?? state.chart?.floors[0]
}

// ---------------------------------------------------------------------------
// Varsayılan kategori paleti (tasarım sisteminden)
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Category[] = [
  { id: nanoid(), label: 'Balcony',      color: '#457B9D', isWheelchair: false, order: 0 },
  { id: nanoid(), label: 'Ground Floor', color: '#E63946', isWheelchair: false, order: 1 },
]

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    // ---- State ----
    chart: null,
    activeTool: 'select',
    activeFloorId: null,
    selectedObjectIds: [],
    selectedSeatIds: [],
    viewport: { x: 0, y: 0, scale: 1 },

    // ---- Temel ----

    initChart: (venueType) => {
      const floorId = nanoid()
      set((s) => {
        s.chart = {
          id: nanoid(),
          name: 'Untitled Venue',
          venueType,
          floors: [{ id: floorId, label: 'Floor 1', order: 0, sections: [], objects: [] }],
          categories: DEFAULT_CATEGORIES,
          origin: { x: 0, y: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        s.activeFloorId = floorId
      })
    },

    setActiveTool: (tool) => set((s) => { s.activeTool = tool }),

    // ---- Seçim ----

    selectObjects: (ids) => set((s) => { s.selectedObjectIds = ids }),
    clearSelection: () => set((s) => { s.selectedObjectIds = []; s.selectedSeatIds = [] }),

    // ---- Row CRUD ----

    addRow: (row) =>
      set((s) => {
        const floor = getActiveFloor(s)
        floor?.objects.push(row)
      }),

    updateRow: (rowId, patch) =>
      set((s) => {
        const floor = getActiveFloor(s)
        if (!floor) return
        const row = floor.objects.find((o) => o.id === rowId) as Row | undefined
        if (!row) return
        Object.assign(row, patch)
      }),

    removeRows: (rowIds) =>
      set((s) => {
        const floor = getActiveFloor(s)
        if (!floor) return
        floor.objects = floor.objects.filter((o) => !rowIds.includes(o.id))
        s.selectedObjectIds = s.selectedObjectIds.filter((id) => !rowIds.includes(id))
      }),

    // ---- Koltuk güncelleme ----

    updateSeats: (seatIds, patch) =>
      set((s) => {
        const floor = getActiveFloor(s)
        if (!floor) return
        for (const obj of floor.objects) {
          if (obj.type !== 'row') continue
          for (const seat of (obj as Row).seats) {
            if (seatIds.includes(seat.id)) Object.assign(seat, patch)
          }
        }
      }),

    // ---- Kategori ataması (row bazlı) ----

    assignCategoryToSelectedRows: (categoryId) =>
      set((s) => {
        const floor = getActiveFloor(s)
        if (!floor) return
        for (const obj of floor.objects) {
          if (obj.type !== 'row') continue
          if (!s.selectedObjectIds.includes(obj.id)) continue
          for (const seat of (obj as Row).seats) {
            if (!seat.categoryIds.includes(categoryId)) {
              seat.categoryIds.push(categoryId)
            }
          }
        }
      }),

    removeCategoryFromSelectedRows: (categoryId) =>
      set((s) => {
        const floor = getActiveFloor(s)
        if (!floor) return
        for (const obj of floor.objects) {
          if (obj.type !== 'row') continue
          if (!s.selectedObjectIds.includes(obj.id)) continue
          for (const seat of (obj as Row).seats) {
            seat.categoryIds = seat.categoryIds.filter((id) => id !== categoryId)
          }
        }
      }),

    // ---- Category CRUD ----

    addCategory: (label) => {
      const category: Category = {
        id: nanoid(),
        label,
        color: '#2A9D8F',   // varsayılan renk
        isWheelchair: false,
        order: get().chart?.categories.length ?? 0,
      }
      set((s) => { s.chart?.categories.push(category) })
      return category
    },

    updateCategory: (categoryId, patch) =>
      set((s) => {
        const cat = s.chart?.categories.find((c) => c.id === categoryId)
        if (cat) Object.assign(cat, patch)
      }),

    removeCategory: (categoryId) =>
      set((s) => {
        if (!s.chart) return

        // Kategoriye bağlı koltukların referansını temizle
        for (const floor of s.chart.floors) {
          for (const obj of floor.objects) {
            if (obj.type !== 'row') continue
            for (const seat of (obj as Row).seats) {
              seat.categoryIds = seat.categoryIds.filter((id) => id !== categoryId)
            }
          }
        }

        s.chart.categories = s.chart.categories.filter((c) => c.id !== categoryId)
      }),

    reorderCategories: (orderedIds) =>
      set((s) => {
        if (!s.chart) return
        // Verilen sıraya göre order alanını güncelle
        orderedIds.forEach((id, idx) => {
          const cat = s.chart!.categories.find((c) => c.id === id)
          if (cat) cat.order = idx
        })
        s.chart.categories.sort((a, b) => a.order - b.order)
      }),
  })),
)

// ---------------------------------------------------------------------------
// Selector — seçili row'ların category durumu
// Tüm seçili row'ların koltuklarındaki categoryIds birleşimi
// ---------------------------------------------------------------------------

export function useSelectedRowCategories() {
  return useEditorStore((s) => {
    const floor = s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? s.chart?.floors[0]
    if (!floor) return { assignedIds: [] as string[], categories: s.chart?.categories ?? [] }

    const assignedIds = new Set<string>()
    for (const obj of floor.objects) {
      if (obj.type !== 'row') continue
      if (!s.selectedObjectIds.includes(obj.id)) continue
      for (const seat of (obj as Row).seats) {
        for (const cid of seat.categoryIds) assignedIds.add(cid)
      }
    }

    return {
      assignedIds: [...assignedIds],
      categories: s.chart?.categories ?? [],
    }
  })
}