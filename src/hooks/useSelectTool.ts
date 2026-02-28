'use client'

// Select Tool — row ve obje seçim yönetimi
// Transformer için seçili node'ların ref'lerini tutar
// Shift+click: çoklu seçim
// Boş canvas click (shift yok): seçimi temizle
// Boş canvas click (shift var): seçimi koru — additive marquee akışını bozmaz
// Handle drag sırasında stage click'in seçimi temizlemesi engellenir

import { useCallback } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'

// Handle'ın drag'de olduğunu global flag ile işaretle — modül seviyesinde paylaşılır
let _isResizeDragging = false
export const setResizeDragging = (v: boolean) => { _isResizeDragging = v }
export const isResizeDragging  = ()            => _isResizeDragging

export function useSelectTool(stageRef: React.RefObject<Konva.Stage | null>) {
  const { activeTool, selectObjects, clearSelection } = useEditorStore(
    useShallow((s) => ({
      activeTool:    s.activeTool,
      selectObjects: s.selectObjects,
      clearSelection: s.clearSelection,
    })),
  )

  const isActive = activeTool === 'select'

  // Canvas boş alanına tıklayınca seçimi temizle
  // Shift basılıysa temizleme — additive marquee sonrası click seçimi silmesin
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      if (_isResizeDragging) return   // Marquee veya handle drag bitti — seçimi koru
      if (e.evt.shiftKey) return      // Shift basılıysa boş tıklama seçimi silmez
      if (e.evt.ctrlKey || e.evt.metaKey) return  // Ctrl basılıysa da silme
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

  return { isActive, handleStageClick, handleObjectSelect }
}