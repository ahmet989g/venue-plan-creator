'use client'

// Row bileşeni
//
// Fragment yapısı — iki ayrı Konva node döner:
//   1) <Group id={row.id}>  → koltuklar, Transformer bu Group'u hedef alır
//   2) <RowLabel>           → dünya koordinatlarında sibling, Transformer'ı etkilemez
//
// Tangent hesabı:
//   Curved row'da ilk/son koltuk teğet açısı row.rotation'dan farklıdır.
//   localTangentFirst = atan2(pos[1].y - pos[0].y, pos[1].x - pos[0].x)
//   worldRotL         = row.rotation + localTangentFirstDeg
//   Düz row'da (curve=0): pos tüm y=0 → tangent=0 → worldRot = row.rotation (doğru)
//
// Dünya koordinatı dönüşümü:
//   Group local (lx, ly) → world:
//     wx = row.x + cos(rowRad)*lx - sin(rowRad)*ly
//     wy = row.y + sin(rowRad)*lx + cos(rowRad)*ly

import { memo, useCallback, useMemo } from 'react'
import { Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore } from '@/store/editor.store'
import SeatShape from './SeatShape'
import RowLabel from './RowLabel'
import { computeCurvedSeatPositions } from '@/lib/geometry'
import { DEFAULT_SEAT_COLOR, MULTI_CATEGORY_COLOR } from '@/lib/constants'
import type { Row, Category, Seat, Point } from '@/store/types'

interface RowShapeProps {
  row: Row
  categories: Category[]
  isSelected: boolean
  onSelect: (rowId: string, multi: boolean) => void
  onDragStart: (e: MouseEvent, ids: string[]) => void
}

function resolveSeatColor(seat: Seat, categories: Category[]): string {
  if (seat.categoryIds.length === 0) return DEFAULT_SEAT_COLOR
  if (seat.categoryIds.length > 1) return MULTI_CATEGORY_COLOR
  return categories.find((c) => c.id === seat.categoryIds[0])?.color ?? DEFAULT_SEAT_COLOR
}

// Group yerel koordinatını dünya koordinatına çevirir
function localToWorld(row: Row, lx: number, ly: number): Point {
  const rad = row.rotation * (Math.PI / 180)
  return {
    x: row.x + Math.cos(rad) * lx - Math.sin(rad) * ly,
    y: row.y + Math.sin(rad) * lx + Math.cos(rad) * ly,
  }
}

function RowShape({ row, categories, onSelect, onDragStart }: RowShapeProps) {
  const selectedSeatIds = useEditorStore((s) => s.selectedSeatIds)
  const selectSeats = useEditorStore((s) => s.selectSeats)

  // Koltuk pozisyonları — Group yerel koordinatı
  const seatPositions = useMemo(
    () => computeCurvedSeatPositions(row.seats.length, row.seatSpacing, row.curve),
    [row.seats.length, row.seatSpacing, row.curve],
  )

  // Dünya koordinatları ve tangent açıları — RowLabel için
  const labelProps = useMemo(() => {
    const n = seatPositions.length
    const pos0 = seatPositions[0] ?? { x: 0, y: 0 }
    const posN = seatPositions[n - 1] ?? { x: 0, y: 0 }
    const pos1 = seatPositions[1] ?? posN    // İkinci koltuk (tangent için)
    const posP = seatPositions[n - 2] ?? pos0 // Sondan ikinci koltuk

    // Yerel teğet açıları (radyan → derece)
    const localTangentFirstDeg = n > 1
      ? Math.atan2(pos1.y - pos0.y, pos1.x - pos0.x) * (180 / Math.PI)
      : 0
    const localTangentLastDeg = n > 1
      ? Math.atan2(posN.y - posP.y, posN.x - posP.x) * (180 / Math.PI)
      : 0

    return {
      worldFirst: localToWorld(row, pos0.x, pos0.y),
      worldLast: localToWorld(row, posN.x, posN.y),
      worldRotL: row.rotation + localTangentFirstDeg,
      worldRotR: row.rotation + localTangentLastDeg,
    }
  }, [row, seatPositions])

  const handleSeatSelect = useCallback(
    (seatId: string, multi: boolean) => {
      const current = useEditorStore.getState().selectedSeatIds
      if (multi) {
        const next = current.includes(seatId)
          ? current.filter((id) => id !== seatId)
          : [...current, seatId]
        selectSeats(next)
      } else {
        selectSeats([seatId])
      }
    },
    [selectSeats],
  )

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const activeTool = useEditorStore.getState().activeTool
      if (activeTool !== 'select') return
      e.cancelBubble = true
      const currentSelected = useEditorStore.getState().selectedObjectIds
      const idsToMove = currentSelected.includes(row.id) ? currentSelected : [row.id]
      onDragStart(e.evt, idsToMove)
    },
    [row.id, onDragStart],
  )

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const activeTool = useEditorStore.getState().activeTool
      if (activeTool !== 'select') return
      e.cancelBubble = true
      onSelect(row.id, e.evt.shiftKey)
    },
    [row.id, onSelect],
  )

  return (
    <>
      {/* ── 1) Koltuk Group — Transformer bu node'u hedef alır ── */}
      <Group
        id={row.id}
        x={row.x}
        y={row.y}
        rotation={row.rotation}
        visible={row.isVisible}
        onClick={handleClick}
        onTap={handleClick}
        onMouseDown={handleMouseDown}
      >
        {row.seats.map((seat, i) => {
          const pos = seatPositions[i] ?? { x: i * row.seatSpacing, y: 0 }
          return (
            <SeatShape
              key={seat.id}
              seat={seat}
              x={pos.x}
              y={pos.y}
              categoryColor={resolveSeatColor(seat, categories)}
              isSelected={selectedSeatIds.includes(seat.id)}
              onSelect={handleSeatSelect}
            />
          )
        })}
      </Group>

      {/* ── 2) Row Label — sibling, Transformer bounding box'ını etkilemez ── */}
      <RowLabel
        row={row}
        worldFirst={labelProps.worldFirst}
        worldLast={labelProps.worldLast}
        worldRotL={labelProps.worldRotL}
        worldRotR={labelProps.worldRotR}
      />
    </>
  )
}

export default memo(RowShape)