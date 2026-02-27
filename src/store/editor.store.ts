// Editor'ün merkezi state yönetimi — Zustand + Immer
// Tüm canvas, tool ve venue verisi burada yaşar

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type {
  VenueChart,
  VenueType,
  ToolType,
  Floor,
  ChartObject,
  Category,
  Row,
  Seat,
  Viewport,
  EditingContext,
} from './types'
import { DEFAULT_ROW_SPACING, DEFAULT_SEAT_SPACING, MAX_HISTORY_SIZE } from '@/lib/constants'
import { computeSeatLabels } from '@/lib/seat-labeling'

// --- State Tipi ---

interface EditorState {
  chart:             VenueChart | null
  activeFloorId:     string | null
  activeTool:        ToolType
  previousTool:      ToolType | null
  selectedObjectIds: string[]
  selectedSeatIds:   string[]
  viewport:          Viewport
  isGridVisible:     boolean
  isSnapEnabled:     boolean
  editingContext:    EditingContext
  history:           VenueChart[]
  historyIndex:      number
  isPanning:         boolean
  rowToolSettings:   RowToolSettings
  isInteracting:     boolean  // drag veya rotate süresince true
}

export interface RowToolSettings {
  seatSpacing: number
  rowSpacing:  number
}

// --- Action Tipi ---

interface EditorActions {
  initChart:    (venueType: VenueType) => void
  setChartName: (name: string) => void

  addFloor:    () => void
  setActiveFloor: (floorId: string) => void
  removeFloor: (floorId: string) => void
  renameFloor: (floorId: string, label: string) => void

  addObject:             (object: ChartObject) => void
  updateObject:          (id: string, updates: Partial<ChartObject>) => void
  removeObject:          (id: string) => void
  removeSelectedObjects: () => void

  selectObjects: (ids: string[]) => void
  selectSeats:   (ids: string[]) => void
  clearSelection: () => void

  setActiveTool:       (tool: ToolType) => void
  setTemporaryTool:    (tool: ToolType) => void
  restorePreviousTool: () => void

  setViewport:         (viewport: Viewport) => void
  toggleGrid:          () => void
  toggleSnap:          () => void
  setIsPanning:        (value: boolean) => void
  setRowToolSettings:  (patch: Partial<RowToolSettings>) => void
  setInteracting:      (value: boolean) => void

  enterSectionContext: (sectionId: string, floorId: string) => void
  exitSectionContext:  () => void

  addCategory:          (label: string, color: string) => void
  updateCategory:       (id: string, updates: Partial<Category>) => void
  removeCategory:       (id: string) => void
  reorderCategories:    (orderedIds: string[]) => void
  // Seçili koltuklar (veya tüm row) için kategori ataması
  assignCategoryToSeats: (seatIds: string[], categoryId: string, remove?: boolean) => void

  // Labeling alanlarını güncelle ve seat label'larını yeniden hesapla
  updateRowLabeling: (rowId: string, patch: Partial<Pick<Row,
    'seatLabelingMode' | 'seatLabelStartAt' | 'seatLabelDirection' |
    'sectionLabel' | 'rowLabel' | 'rowLabelPosition'
  >>) => void

  // Çoklu row güncelleme — aynı patch'i birden fazla row'a uygular
  updateRows: (rowIds: string[], patch: Partial<Row>) => void

  undo:        () => void
  redo:        () => void
  pushHistory: () => void

  publish: () => void
}

type EditorStore = EditorState & EditorActions

// --- Yardımcı Fonksiyonlar ---

const defaultViewport: Viewport = { x: 0, y: 0, scale: 1 }

const createDefaultFloor = (order: number): Floor => ({
  id:           nanoid(),
  label:        order === 0 ? 'Ground Floor' : `Floor ${order + 1}`,
  order,
  sections:     [],
  objects:      [],
  lastViewport: { ...defaultViewport },
})

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

// --- Store ---

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    immer((set, get) => ({

      // --- Initial State ---

      chart:             null,
      activeFloorId:     null,
      activeTool:        'select',
      previousTool:      null,
      selectedObjectIds: [],
      selectedSeatIds:   [],
      viewport:          { ...defaultViewport },
      isGridVisible:     true,
      isSnapEnabled:     true,
      editingContext:    null,
      history:           [],
      historyIndex:      -1,
      isPanning:         false,
      isInteracting:  false,
      rowToolSettings: {
        seatSpacing: DEFAULT_SEAT_SPACING,
        rowSpacing:  DEFAULT_ROW_SPACING,
      },

      // --- Venue ---

      initChart: (venueType) => {
        const firstFloor = createDefaultFloor(0)
        const now = new Date()

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

      // --- Floor ---

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

      // --- Nesneler ---

      addObject: (object) => {
        get().pushHistory()
        set((state) => {
          if (!state.chart || !state.activeFloorId) return
          const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
          if (floor) {
            floor.objects.push(object as Floor['objects'][number])
            state.chart.updatedAt = new Date()
          }
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
          if (floor) {
            floor.objects    = floor.objects.filter((o) => o.id !== id)
            state.chart.updatedAt = new Date()
          }
        })
      },

      removeSelectedObjects: () => {
        const { selectedObjectIds } = get()
        if (selectedObjectIds.length === 0) return
        get().pushHistory()

        set((state) => {
          if (!state.chart || !state.activeFloorId) return
          const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
          if (floor) {
            floor.objects = floor.objects.filter(
              (o) => !selectedObjectIds.includes(o.id),
            )
          }
          state.selectedObjectIds = []
          state.selectedSeatIds   = []
        })
      },

      // --- Seçim ---

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

      // --- Tool ---

      setActiveTool: (tool) => {
        set((state) => {
          state.activeTool   = tool
          state.previousTool = null
        })
      },

      setTemporaryTool: (tool) => {
        set((state) => {
          state.previousTool = state.activeTool
          state.activeTool   = tool
        })
      },

      restorePreviousTool: () => {
        set((state) => {
          if (state.previousTool) {
            state.activeTool   = state.previousTool
            state.previousTool = null
          }
        })
      },

      // --- Canvas ---

      setViewport: (viewport) => {
        set((state) => { state.viewport = viewport })
      },

      toggleGrid: () => {
        set((state) => { state.isGridVisible = !state.isGridVisible })
      },

      toggleSnap: () => {
        set((state) => { state.isSnapEnabled = !state.isSnapEnabled })
      },

      setIsPanning: (value) => {
        set((state) => { state.isPanning = value })
      },

      setRowToolSettings: (patch) => {
        set((state) => {
          state.rowToolSettings = { ...state.rowToolSettings, ...patch }
        })
      },

      setInteracting: (value) => {
        set((state) => { state.isInteracting = value })
      },

      // --- Section Context ---

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
        const { editingContext } = get()
        set((state) => {
          if (editingContext) state.viewport = { ...editingContext.previousViewport }
          state.editingContext = null
        })
      },

      // --- Kategoriler ---

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

          // Kategoriye ait referansları tüm floor'lardaki seat'lerden temizle
          for (const floor of state.chart.floors) {
            for (const obj of floor.objects) {
              if (obj.type === 'row') {
                const row = obj as Row
                for (const seat of row.seats) {
                  seat.categoryIds = seat.categoryIds.filter((cId) => cId !== id)
                }
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

      // Seçili koltuk ID'lerine kategori ekle veya çıkar
      assignCategoryToSeats: (seatIds, categoryId, remove = false) => {        if (seatIds.length === 0) return
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

      // Labeling alanlarını güncelle ve seat label'larını otomatik yeniden hesapla
      updateRowLabeling: (rowId, patch) => {
        set((state) => {
          if (!state.chart || !state.activeFloorId) return
          const floor = state.chart.floors.find((f) => f.id === state.activeFloorId)
          if (!floor) return

          const obj = floor.objects.find((o) => o.id === rowId)
          if (!obj || obj.type !== 'row') return

          const row = obj as Row

          // Patch uygula
          Object.assign(row, patch)

          // Seat label'larını yeniden hesapla — labeling alanı değişti
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
              'seatLabelingMode'    in patch ||
              'seatLabelStartAt'    in patch ||
              'seatLabelDirection'  in patch

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

      // --- Undo/Redo ---

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
          state.chart            = deepClone(target)
          state.historyIndex     = historyIndex - 1
          state.selectedObjectIds = []
          state.selectedSeatIds  = []
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

      // --- Publish ---

      publish: () => {
        const { chart } = get()
        if (!chart) return
        // TODO: Gerçek publish endpoint'i eklenecek
        console.log('[Venue Plan Creator] Published Chart:', JSON.stringify(chart, null, 2))
      },
    })),
  ),
)

// --- Selector Hook'ları ---
// Bileşenler doğrudan bu hook'ları kullanır — gereksiz re-render önlenir

export const useActiveFloor = () =>
  useEditorStore((s) => s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null)

export const useActiveTool      = () => useEditorStore((s) => s.activeTool)
export const useSelectedObjectIds = () => useEditorStore((s) => s.selectedObjectIds)
export const useIsGridVisible   = () => useEditorStore((s) => s.isGridVisible)
export const useIsSnapEnabled   = () => useEditorStore((s) => s.isSnapEnabled)
export const useEditingContext  = () => useEditorStore((s) => s.editingContext)
export const useCategories      = () => useEditorStore((s) => s.chart?.categories ?? [])
export const useCanUndo         = () => useEditorStore((s) => s.historyIndex > 0)
export const useCanRedo         = () => useEditorStore((s) => s.historyIndex < s.history.length - 1)
export const useVenueType       = () => useEditorStore((s) => s.chart?.venueType ?? null)