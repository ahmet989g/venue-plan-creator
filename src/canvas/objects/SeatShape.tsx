'use client'

// Tekil koltuk — dünya koordinatında sabit boyut
// Konva stage scale'i her şeyi orantılı büyütür/küçültür — ayrıca scale hesabı gerekmez

import { memo } from 'react'
import { Circle, Group, Text } from 'react-konva'
import { SEAT_RADIUS } from '@/lib/constants'
import type { Seat } from '@/store/types'

const COLORS = {
  free: (color: string) => color,
  selected: '#ffffff',
  unavailable: '#3a3a3a',
  default: '#4a90d9',
}

interface SeatShapeProps {
  seat: Seat
  x: number
  y: number
  categoryColor: string
  isSelected: boolean
  onSelect: (seatId: string, multi: boolean) => void
}

function SeatShape({ seat, x, y, categoryColor, isSelected, onSelect }: SeatShapeProps) {
  const fill = isSelected
    ? COLORS.selected
    : seat.isAvailable
      ? COLORS.free(categoryColor)
      : COLORS.unavailable

  return (
    <Group
      x={x}
      y={y}
      onClick={(e) => onSelect(seat.id, e.evt.shiftKey)}
      onTap={(e) => onSelect(seat.id, e.evt.shiftKey)}
    >
      <Circle
        radius={SEAT_RADIUS}
        fill={fill}
        stroke={isSelected ? '#f78166' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        perfectDrawEnabled={false}
      />

      {seat.accessible && (
        <Text
          text="♿"
          fontSize={SEAT_RADIUS * 0.9}
          fill="#ffffff"
          align="center"
          verticalAlign="middle"
          offsetX={SEAT_RADIUS * 0.45}
          offsetY={SEAT_RADIUS * 0.45}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  )
}

export default memo(SeatShape)