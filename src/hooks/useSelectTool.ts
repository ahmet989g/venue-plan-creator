'use client'

// Select Tool — row ve obje seçim yönetimi
// Transformer için seçili node'ların ref'lerini tutar
// Shift+click: çoklu seçim, boş canvas: seçimi temizle
// Handle drag sırasında stage click'in seçimi temizlemesi engellenir

import { useCallback, useRef } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'

// Handle'ın drag'de olduğunu global flag ile işaretle — modül seviyesinde paylaşılır
let _isResizeDragging = false
export const setResizeDragging = (v: boolean) => { _isResizeDragging = v }
export const isResizeDragging  = ()            => _isResizeDragging

export function useSelectTool(stageRef: React.RefObject<Konva.Stage | null>) {
  const { activeTool, selectedObjectIds, selectObjects, clearSelection } = useEditorStore(
    useShallow((s) => ({
      activeTool:        s.activeTool,
      selectedObjectIds: s.selectedObjectIds,
      selectObjects:     s.selectObjects,
      clearSelection:    s.clearSelection,
    })),
  )

  const isActive = activeTool === 'select'

  // Canvas boş alanına tıklayınca seçimi temizle
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      if (_isResizeDragging) return          // Handle drag bitti, seçimi korut
      const stage = stageRef.current
      if (!stage || e.target !== stage) return
      clearSelection()
    },
    [isActive, stageRef, clearSelection],
  )

  // Row veya objeye tıklayınca seç
  const handleObjectSelect = useCallback(
    (objectId: string, multi: boolean) => {
      if (multi) {
        const current = useEditorStore.getState().selectedObjectIds
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

  return { isActive, selectedObjectIds, handleStageClick, handleObjectSelect }
}