// Editor store — tüm slice'ları birleştirir
// Bu dosya sadece kombinasyon ve export yapar, iş mantığı slice'larda yaşar
//
// Slice bağımlılık sırası:
//   history  → bağımsız
//   canvas   → bağımsız
//   tool     → bağımsız
//   selection→ bağımsız
//   chart    → history (pushHistory, historyIndex)
//   object   → history (pushHistory), chart (floor lookup)
//   category → (bağımsız, set üzerinden chart'a yazar)
//   row      → history (pushHistory), chart (floor lookup)
//   section  → history (pushHistory), chart (floor lookup), canvas (viewport)

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

import { createHistorySlice,   type HistorySlice   } from './slices/history.slice'
import { createCanvasSlice,    type CanvasSlice     } from './slices/canvas.slice'
import { createToolSlice,      type ToolSlice       } from './slices/tool.slice'
import { createSelectionSlice, type SelectionSlice  } from './slices/selection.slice'
import { createChartSlice,     type ChartSlice      } from './slices/chart.slice'
import { createObjectSlice,    type ObjectSlice     } from './slices/object.slice'
import { createCategorySlice,  type CategorySlice   } from './slices/category.slice'
import { createRowSlice,       type RowSlice        } from './slices/row.slice'
import { createSectionSlice,   type SectionSlice    } from './slices/section.slice'

// RowToolSettings'i tek yerden export et — dışarıdan tüketiciler bu tipi kullanır
export type { RowToolSettings } from './slices/row.slice'

// EditorStore — tüm slice'ların birleşimi
// Tip tanımı burada merkezi olarak tutulur, slice'lar bu tipi generic parametre olarak alır
export type EditorStore =
  & HistorySlice
  & CanvasSlice
  & ToolSlice
  & SelectionSlice
  & ChartSlice
  & ObjectSlice
  & CategorySlice
  & RowSlice
  & SectionSlice

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    immer((...args) => ({
      ...createHistorySlice(...args),
      ...createCanvasSlice(...args),
      ...createToolSlice(...args),
      ...createSelectionSlice(...args),
      ...createChartSlice(...args),
      ...createObjectSlice(...args),
      ...createCategorySlice(...args),
      ...createRowSlice(...args),
      ...createSectionSlice(...args),
    })),
  ),
)

// --- Selector hook'ları ---
// Bileşenler doğrudan bu hook'ları kullanır — gereksiz re-render önlenir

export const useActiveFloor = () =>
  useEditorStore((s) => s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null)

export const useActiveTool        = () => useEditorStore((s) => s.activeTool)
export const useSelectedObjectIds = () => useEditorStore((s) => s.selectedObjectIds)
export const useIsGridVisible     = () => useEditorStore((s) => s.isGridVisible)
export const useIsSnapEnabled     = () => useEditorStore((s) => s.isSnapEnabled)
export const useEditingContext    = () => useEditorStore((s) => s.editingContext)
export const useCategories        = () => useEditorStore((s) => s.chart?.categories ?? [])
export const useCanUndo           = () => useEditorStore((s) => s.historyIndex > 0)
export const useCanRedo           = () => useEditorStore((s) => s.historyIndex < s.history.length - 1)
export const useVenueType         = () => useEditorStore((s) => s.chart?.venueType ?? null)