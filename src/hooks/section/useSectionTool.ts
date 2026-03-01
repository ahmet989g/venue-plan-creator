'use client'

// Section Tool canvas event hook
// Polygon: click → nokta ekle, dbl-click veya ilk noktaya tıkla → kapat
//          Shift → son noktadan 15° snap
// Rect:    mousedown drag mouseup → dikdörtgen
//          Shift → kare zorla
// Esc:     çizimi iptal et

import { useState, useCallback, useRef, useEffect } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import { screenToCanvas } from '@/lib/geometry'
import {
  initialPolygonState,
  initialRectState,
  handlePolygonClick,
  handlePolygonMouseMove,
  handlePolygonDblClick,
  handleRectMouseDown,
  handleRectMouseMove,
  handleRectMouseUp,
  type PolygonToolState,
  type RectToolState,
  type SectionToolState,
} from '@/canvas/tools/section/SectionTool'

export interface SectionToolHookResult {
  toolState:            SectionToolState
  handleStageClick:     (e: KonvaEventObject<MouseEvent>) => void
  handleStageMouseMove: (e: KonvaEventObject<MouseEvent>) => void
  handleStageDblClick:  (e: KonvaEventObject<MouseEvent>) => void
  handleMouseDown:      (e: KonvaEventObject<MouseEvent>) => void
  handleMouseUp:        (e: KonvaEventObject<MouseEvent>) => void
  handleKeyDown:        (e: KeyboardEvent) => void
}

export function useSectionTool(
  stageRef: React.RefObject<Konva.Stage | null>,
): SectionToolHookResult {
  const [polygonState, setPolygonState] = useState<PolygonToolState>(initialPolygonState)
  const [rectState,    setRectState]    = useState<RectToolState>(initialRectState)

  // Shift tuşu durumu — ref ile takip (re-render tetiklemez)
  const shiftRef = useRef(false)

  const { activeTool, activeFloorId, addSection } = useEditorStore(
    useShallow((s) => ({
      activeTool:    s.activeTool,
      activeFloorId: s.activeFloorId,
      addSection:    s.addSection,
    })),
  )

  const isPolygon = activeTool === 'section'
  const isRect    = activeTool === 'rectangular-section'
  const isActive  = isPolygon || isRect

  // Aktif floor section sayısı → order hesabı
  const orderRef = useRef(0)
  useEffect(() => {
    return useEditorStore.subscribe((s) => {
      const floor = s.chart?.floors.find((f) => f.id === s.activeFloorId)
      orderRef.current = floor?.sections.length ?? 0
    })
  }, [])

  // Tool değişince state'i sıfırla
  useEffect(() => {
    if (!isActive) {
      setPolygonState(initialPolygonState)
      setRectState(initialRectState)
    }
  }, [isActive])

  // Global shift takibi
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

  // Canvas koordinatına çevir
  const toWorld = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return null
    const ptr = stage.getPointerPosition()
    if (!ptr) return null
    return screenToCanvas(ptr, stage.x(), stage.y(), stage.scaleX())
  }, [stageRef])

  // ─── Polygon handlers ────────────────────────────────────────────────────

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isPolygon || !activeFloorId) return
      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      const point = toWorld(e)
      if (!point) return

      const { nextState, newSection } = handlePolygonClick(
        polygonState, point, shiftRef.current, activeFloorId, orderRef.current,
      )
      setPolygonState(nextState)
      if (newSection) addSection(newSection)
    },
    [isPolygon, activeFloorId, polygonState, toWorld, addSection, stageRef],
  )

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      const stage = stageRef.current
      if (!stage) return
      const point = toWorld(e)
      if (!point) return

      if (isPolygon) {
        setPolygonState((prev) =>
          handlePolygonMouseMove(prev, point, shiftRef.current, stage.scaleX()),
        )
      } else {
        setRectState((prev) => handleRectMouseMove(prev, point, shiftRef.current))
      }
    },
    [isActive, isPolygon, toWorld, stageRef],
  )

  const handleStageDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isPolygon || !activeFloorId) return
      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      const { nextState, newSection } = handlePolygonDblClick(
        polygonState, activeFloorId, orderRef.current,
      )
      setPolygonState(nextState)
      if (newSection) addSection(newSection)
    },
    [isPolygon, activeFloorId, polygonState, addSection, stageRef],
  )

  // ─── Rect handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isRect || !activeFloorId) return
      const stage = stageRef.current
      if (!stage || e.target !== stage) return

      const point = toWorld(e)
      if (!point) return

      setRectState((prev) => handleRectMouseDown(prev, point))
    },
    [isRect, activeFloorId, toWorld, stageRef],
  )

  const handleMouseUp = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      if (!isRect || !activeFloorId) return
      const { nextState, newSection } = handleRectMouseUp(
        rectState, activeFloorId, orderRef.current,
      )
      setRectState(nextState)
      if (newSection) addSection(newSection)
    },
    [isRect, activeFloorId, rectState, addSection],
  )

  // ─── Keyboard ────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return
      if (e.code === 'Escape') {
        setPolygonState(initialPolygonState)
        setRectState(initialRectState)
      }
    },
    [isActive],
  )

  const toolState: SectionToolState = isPolygon ? polygonState : rectState

  return {
    toolState,
    handleStageClick,
    handleStageMouseMove,
    handleStageDblClick,
    handleMouseDown,
    handleMouseUp,
    handleKeyDown,
  }
}