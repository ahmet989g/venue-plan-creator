'use client'

// Row Tool canvas event hook
// Shift: 15° angle snap
// Alt: snap geçici iptal
// useSnapping ile cursor en yakın snap noktasına çekilir

import { useState, useCallback, useRef, useEffect } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { screenToCanvas } from '@/lib/geometry'
import { useSnapping } from '@/hooks/canvas/useSnapping'
import {
  initialRowToolState,
  handleRowToolClick,
  handleRowToolMouseMove,
  type RowToolState,
} from '@/canvas/tools/row/RowTool'
import type { SnapPoint } from '@/lib/snapPoints'

export interface RowToolHookResult {
  toolState:       RowToolState
  snapTarget:      SnapPoint | null
  handleClick:     (e: KonvaEventObject<MouseEvent>) => void
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void
  handleKeyDown:   (e: KeyboardEvent) => void
}

export function useRowTool(stageRef: React.RefObject<Konva.Stage | null>): RowToolHookResult {
  const [toolState,  setToolState]  = useState<RowToolState>(initialRowToolState)
  const [snapTarget, setSnapTarget] = useState<SnapPoint | null>(null)

  const shiftRef = useRef(false)

  const { activeTool, activeFloorId, editingContext, addObject, seatSpacing, rowSpacing } =
    useEditorStore(
      useShallow((s) => ({
        activeTool:     s.activeTool,
        activeFloorId:  s.activeFloorId,
        editingContext: s.editingContext,
        addObject:      s.addObject,
        seatSpacing:    s.rowToolSettings.seatSpacing,
        rowSpacing:     s.rowToolSettings.rowSpacing,   // Yeni row'un rowSpacing değeri
      })),
    )

  const { resolveSnap } = useSnapping()
  const isActive = activeTool === 'row'

  // Shift takibi
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = true  }
    const onKeyUp   = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // Cursor'u al, snap uygula
  const getSnappedPoint = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return null
    const pointer = stage.getPointerPosition()
    if (!pointer) return null

    const scale  = stage.scaleX()
    const raw    = screenToCanvas(pointer, stage.x(), stage.y(), scale)
    const result = resolveSnap(raw, scale)

    return { raw, snapped: result.point, snapTarget: result.snapTarget }
  }, [stageRef, resolveSnap])

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive || !activeFloorId) return
      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      const resolved = getSnappedPoint()
      if (!resolved) return

      const sectionId = editingContext?.type === 'section'
        ? editingContext.sectionId
        : null

      const { nextState, newRow } = handleRowToolClick(
        toolState,
        resolved.snapped,
        shiftRef.current,
        activeFloorId,
        sectionId,
        seatSpacing,
        rowSpacing,     // ← buildRow'a aktarılır
      )

      setToolState(nextState)
      setSnapTarget(resolved.snapTarget)

      if (newRow) {
        addObject(newRow)
        useEditorStore.getState().pushHistory()
      }
    },
    [isActive, activeFloorId, toolState, editingContext, getSnappedPoint, addObject, stageRef, seatSpacing, rowSpacing],
  )

  const handleMouseMove = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      const resolved = getSnappedPoint()
      if (!resolved) return

      setSnapTarget(resolved.snapTarget)
      setToolState((prev) => handleRowToolMouseMove(prev, resolved.snapped, shiftRef.current, seatSpacing))
    },
    [isActive, getSnappedPoint, seatSpacing],
  )

  // Tool değişince sıfırla
  useEffect(() => {
    if (!isActive) {
      setToolState(initialRowToolState)
      setSnapTarget(null)
    }
  }, [isActive])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return
      if (e.code === 'Escape') {
        setToolState(initialRowToolState)
        setSnapTarget(null)
      }
    },
    [isActive],
  )

  return { toolState, snapTarget, handleClick, handleMouseMove, handleKeyDown }
}