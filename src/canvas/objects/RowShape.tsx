'use client'

// Row bileşeni — koltuklar x ekseninde dizilir, Group rotation ile döner
// onMouseDown: select tool'da drag başlatır
// onClick: seçim — sadece threshold aşılmadıysa tetiklenir (drag ile çakışmaz)

import { memo, useCallback, useRef } from 'react'
import { Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore } from '@/store/editor.store'
import SeatShape from './SeatShape'
import type { Row, Category } from '@/store/types'

interface RowShapeProps {
  row: Row
  categories: Category[]
  isSelected: boolean
  onSelect: (rowId: string, multi: boolean) => void
  onDragStart: (e: MouseEvent, ids: string[]) => void
}

function getCategoryColor(categoryId: string | null, categories: Category[]): string {
  if (!categoryId) return '#4a90d9'
  return categories.find((c) => c.id === categoryId)?.color ?? '#4a90d9'
}

function RowShape({ row, categories, onSelect, onDragStart }: RowShapeProps) {
  const selectedSeatIds = useEditorStore((s) => s.selectedSeatIds)
  const selectSeats = useEditorStore((s) => s.selectSeats)

  // Mouse down pozisyonu — click ile drag'i ayırt etmek için
  const mouseDownPos = useRef({ x: 0, y: 0 })

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
      mouseDownPos.current = { x: e.evt.clientX, y: e.evt.clientY }

      // Seçili row'ları al — bu row seçili değilse sadece bunu taşı
      const currentSelected = useEditorStore.getState().selectedObjectIds
      const idsToMove = currentSelected.includes(row.id) ? currentSelected : [row.id]

      onDragStart(e.evt, idsToMove)
    },
    [row.id, onDragStart],
  )

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      // useDragMove threshold'u zaten handle ediyor
      // onClick sadece gerçek tıklamalarda tetiklenir
      onSelect(row.id, e.evt.shiftKey)
    },
    [row.id, onSelect],
  )

  return (
    <Group
      id={row.id}
      x={row.x}
      y={row.y}
      rotation={row.rotation}
      visible={row.isVisible}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {row.seats.map((seat, i) => (
        <SeatShape
          key={seat.id}
          seat={seat}
          x={i * row.seatSpacing}
          y={0}
          categoryColor={getCategoryColor(seat.categoryId, categories)}
          isSelected={selectedSeatIds.includes(seat.id)}
          onSelect={handleSeatSelect}
        />
      ))}
    </Group>
  )
}

export default memo(RowShape)