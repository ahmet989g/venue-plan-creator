'use client'

// Tekil koltuk — dünya koordinatında sabit boyut
// Konva stage scale'i her şeyi orantılı büyütür/küçültür — ayrıca scale hesabı gerekmez
// Label: seat.label string dairenin ortasında gösterilir
// Accessible: ♿ ikonu label'ın üstüne bindirilir

import { memo } from 'react'
import { Circle, Group, Text } from 'react-konva'
import { SEAT_RADIUS } from '@/lib/constants'
import type { Seat } from '@/store/types'

const COLORS = {
  free: (color: string) => color,
  selected: '#ffffff',
  unavailable: '#3a3a3a',
}

// Label font boyutu — karakter sayısına göre küçültülür
function labelFontSize(label: string): number {
  if (label.length <= 1) return SEAT_RADIUS * 0.90
  if (label.length <= 2) return SEAT_RADIUS * 0.75
  if (label.length <= 3) return SEAT_RADIUS * 0.60
  return SEAT_RADIUS * 0.50
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

  // Seçiliyken label koyu, aksi halde beyaz
  const labelColor = isSelected ? '#1f2328' : 'rgba(255,255,255,0.90)'
  const fs = labelFontSize(seat.label)

  return (
    <Group
      x={x}
      y={y}
      onClick={(e) => onSelect(seat.id, e.evt.shiftKey)}
      onTap={(e) => onSelect(seat.id, e.evt.shiftKey)}
    >
      {/* Koltuk dairesi */}
      <Circle
        radius={SEAT_RADIUS}
        fill={fill}
        stroke={isSelected ? '#f78166' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        perfectDrawEnabled={false}
      />

      {/* Koltuk label — dairenin tam ortasında */}
      {seat.label && !seat.accessible && (
        <Text
          text={seat.label}
          fontSize={fs}
          fontStyle="bold"
          fill={labelColor}
          align="center"
          verticalAlign="middle"
          width={SEAT_RADIUS * 2}
          height={SEAT_RADIUS * 2}
          offsetX={SEAT_RADIUS}
          offsetY={SEAT_RADIUS}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Erişilebilirlik ikonu — label yerine gösterilir */}
      {seat.accessible && (
        <Text
          text="♿"
          fontSize={SEAT_RADIUS * 0.9}
          fill={labelColor}
          align="center"
          verticalAlign="middle"
          width={SEAT_RADIUS * 2}
          height={SEAT_RADIUS * 2}
          offsetX={SEAT_RADIUS}
          offsetY={SEAT_RADIUS}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  )
}

export default memo(SeatShape)