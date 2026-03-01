'use client'

// Snap hook — cursor'a en yakın snap noktasını bulur
// Alt basılıyken snap geçici iptal
// rowSpacing: mevcut row'lara dik yönde bu mesafede snap noktaları eklenir

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import {
  collectSnapPoints,
  collectRowSpacingSnapPoints,
  findNearestSnapPoint,
  findMidpointSnapPoints,
  type SnapPoint,
} from '@/lib/snapPoints'
import type { Point, Row } from '@/store/types'

const SNAP_THRESHOLD_PX = 24

export interface SnapResult {
  point:      Point
  snapTarget: SnapPoint | null
  isSnapping: boolean
}

export function useSnapping() {
  const altRef = useRef(false)

  const { activeFloor, rowSpacing } = useEditorStore(
    useShallow((s) => ({
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
      rowSpacing:  s.rowToolSettings.rowSpacing,
    })),
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt') altRef.current = true  }
    const onKeyUp   = (e: KeyboardEvent) => { if (e.key === 'Alt') altRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // rowSpacing değişince snap noktaları yeniden hesaplanır
  const snapPoints = useMemo(() => {
    if (!activeFloor) return []
    const rows = activeFloor.objects.filter((o): o is Row => o.type === 'row')
    return [
      ...collectSnapPoints(rows),
      ...findMidpointSnapPoints(rows),
      ...collectRowSpacingSnapPoints(rows, rowSpacing),
    ]
  }, [activeFloor, rowSpacing])

  const resolveSnap = useCallback(
    (cursor: Point, scale: number): SnapResult => {
      if (altRef.current || snapPoints.length === 0) {
        return { point: cursor, snapTarget: null, isSnapping: false }
      }

      const threshold = SNAP_THRESHOLD_PX / scale
      const nearest   = findNearestSnapPoint(cursor, snapPoints, threshold)

      if (!nearest) {
        return { point: cursor, snapTarget: null, isSnapping: false }
      }

      return {
        point:      { x: nearest.x, y: nearest.y },
        snapTarget: nearest,
        isSnapping: true,
      }
    },
    [snapPoints],
  )

  return { resolveSnap }
}