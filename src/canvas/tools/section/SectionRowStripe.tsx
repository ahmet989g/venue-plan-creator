'use client'

// Section normal mod önizlemesi — tek bir row'u ince şerit olarak gösterir
//
// Curved row (row.curve !== 0):
//   computeCurvedSeatPositions ile tüm koltuk pozisyonları hesaplanır
//   Bunlar local koordinatta — Group'ta rotation + x,y uygulanır
//   Canvas 2D quadratic bezier ile koltuklar arası polyline çizilir
//
// Düz row (row.curve === 0):
//   İlk-son nokta arası tek Line — performanslı
//
// listening: false — mouse event'leri geçirir

import { memo, useMemo } from 'react'
import { Group, Line, Shape } from 'react-konva'
import type Konva from 'konva'
import { computeCurvedSeatPositions } from '@/lib/geometry'
import type { Row } from '@/store/types'

interface SectionRowStripeProps {
  row: Row
  isDark: boolean
}

function SectionRowStripe({ row, isDark }: SectionRowStripeProps) {
  if (!row.isVisible) return null
  if (row.seats.length === 0) return null

  const strokeColor = isDark
    ? 'rgba(200, 210, 220, 0.50)'
    : 'rgba(40, 50, 60, 0.35)'

  // ─── Düz row — tek çizgi, daha performanslı ───────────────────────────────

  if (row.curve === 0) {
    const lastX = (row.seats.length - 1) * row.seatSpacing
    return (
      <Group
        x={row.x}
        y={row.y}
        rotation={row.rotation}
        listening={false}
      >
        <Line
          points={[0, 0, lastX, 0]}
          stroke={strokeColor}
          strokeWidth={6}
          lineCap="round"
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>
    )
  }

  // ─── Curved row — tüm koltuk pozisyonlarından geçen polyline ─────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const positions = useMemo(
    () => computeCurvedSeatPositions(row.seats.length, row.seatSpacing, row.curve),
    [row.seats.length, row.seatSpacing, row.curve],
  )

  // Flat points dizisi: [x0,y0, x1,y1, ...]
  const flatPoints = useMemo(
    () => positions.flatMap((p) => [p.x, p.y]),
    [positions],
  )

  return (
    <Group
      x={row.x}
      y={row.y}
      rotation={row.rotation}
      listening={false}
    >
      <Line
        points={flatPoints}
        stroke={strokeColor}
        strokeWidth={6}
        lineCap="round"
        lineJoin="round"
        tension={0.4}          // Catmull-Rom interpolasyon — akıcı eğri
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}

export default memo(SectionRowStripe)