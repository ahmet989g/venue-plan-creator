'use client'

// Select Tool — row ve obje seçim yönetimi
//
// Kurallar:
//   Shift+click       → çoklu seçim
//   Boş canvas click  → seçimi temizle (shift/ctrl basılıysa koru)
//   Handle drag       → stage click'in seçimi temizlemesi engellenir
//
// Editing context guard:
//   Section içindeyken (editingContext.type === 'section'):
//   - Diğer section'lar SectionLayer tarafından zaten listening=false
//   - Row dışı nesneler (boş canvas) seçimi temizlememeli
//   - Row'lar section içindeyse seçilebilir

import { useCallback } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'

// Handle drag sırasında stage click'in seçimi temizlemesi engellenir
let _isResizeDragging = false
export const setResizeDragging = (v: boolean) => { _isResizeDragging = v }
export const isResizeDragging  = ()            => _isResizeDragging

export function useSelectTool(stageRef: React.RefObject<Konva.Stage | null>) {
  const { activeTool, isEditingSection, selectObjects, clearSelection } = useEditorStore(
    useShallow((s) => ({
      activeTool:       s.activeTool,
      // Editing context guard — section içinde boş canvas tıklaması seçimi temizlemesin
      isEditingSection: s.editingContext?.type === 'section',
      selectObjects:    s.selectObjects,
      clearSelection:   s.clearSelection,
    })),
  )

  const isActive = activeTool === 'select'

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      if (_isResizeDragging) return
      if (e.evt.shiftKey) return
      if (e.evt.ctrlKey || e.evt.metaKey) return

      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      // Editing context aktifken boş canvas tıklaması seçimi temizlemesin
      // Section içindeki nesnelerin seçimi korunsun
      if (isEditingSection) return

      clearSelection()
    },
    [isActive, isEditingSection, stageRef, clearSelection],
  )

  // Guard: editing context yokken section'a ait row'lar seçilemez
  const handleObjectSelect = useCallback(
    (objectId: string, multi: boolean) => {
      const state = useEditorStore.getState()

      if (!state.editingContext) {
        const floor = state.chart?.floors.find((f) => f.id === state.activeFloorId)
        if (floor) {
          const obj = floor.objects.find((o) => o.id === objectId)
          if (obj?.type === 'row') {
            const row = obj as import('@/store/types').Row
            const inSection =
              row.sectionId != null ||
              floor.sections.some((s) => s.objectIds.includes(objectId))
            if (inSection) return   // Blok modda row'a tıklama → seçimi reddet
          }
        }
      }

      if (multi) {
        const current = state.selectedObjectIds
        const next = current.includes(objectId)
          ? current.filter((id) => id !== objectId)
          : [...current, objectId]
        selectObjects(next)
      } else {
        selectObjects([objectId])
      }
    },
    [selectObjects],
  )

  return { isActive, handleStageClick, handleObjectSelect }
}