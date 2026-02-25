'use client'

// Canvas zoom yönetimi
// Mouse wheel ile focal zoom (mouse konumuna doğru)
// Buton zoom'u canvas merkezini referans alır

import { useCallback } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { MIN_SCALE, MAX_SCALE, ZOOM_FACTOR } from '@/lib/constants'
import { useEditorStore } from '@/store/editor.store'

export function useCanvasZoom() {
  const setViewport = useEditorStore((s) => s.setViewport)

  // Mouse wheel — mouse konumuna focal zoom
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = e.target.getStage()
      if (!stage) return

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      const direction = e.evt.deltaY > 0 ? -1 : 1
      const newScale = direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR
      const clamped = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE)

      const newPos = {
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      }

      stage.scale({ x: clamped, y: clamped })
      stage.position(newPos)

      setViewport({ x: newPos.x, y: newPos.y, scale: clamped })
    },
    [setViewport],
  )

  // Buton zoom — canvas merkezi referans
  const zoomIn = useCallback(
    (stage: Konva.Stage) => {
      const oldScale = stage.scaleX()
      const newScale = Math.min(oldScale * ZOOM_FACTOR, MAX_SCALE)
      applyZoomToCenter(stage, newScale, setViewport)
    },
    [setViewport],
  )

  const zoomOut = useCallback(
    (stage: Konva.Stage) => {
      const oldScale = stage.scaleX()
      const newScale = Math.max(oldScale / ZOOM_FACTOR, MIN_SCALE)
      applyZoomToCenter(stage, newScale, setViewport)
    },
    [setViewport],
  )

  return { handleWheel, zoomIn, zoomOut }
}

// Canvas merkezini sabit tutarak zoom uygular
function applyZoomToCenter(
  stage: Konva.Stage,
  newScale: number,
  setViewport: (v: { x: number; y: number; scale: number }) => void,
) {
  const center = {
    x: stage.width() / 2,
    y: stage.height() / 2,
  }

  const oldScale = stage.scaleX()
  const pointTo = {
    x: (center.x - stage.x()) / oldScale,
    y: (center.y - stage.y()) / oldScale,
  }

  const newPos = {
    x: center.x - pointTo.x * newScale,
    y: center.y - pointTo.y * newScale,
  }

  stage.scale({ x: newScale, y: newScale })
  stage.position(newPos)

  setViewport({ x: newPos.x, y: newPos.y, scale: newScale })
}