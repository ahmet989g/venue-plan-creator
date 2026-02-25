'use client'

// Snap geri bildirim bileşeni
// Snap olan koltuğun etrafında highlight dairesi + snap noktasında artı işareti
// listening: false — mouse event'leri geçirir

import { memo } from 'react'
import { Group, Circle, Line } from 'react-konva'
import { SEAT_RADIUS } from '@/lib/constants'
import type { SnapPoint } from '@/lib/snapPoints'

const HIGHLIGHT_COLOR = 'rgba(255,107,43,0.9)'   // accent — snap olan koltuk
const MARKER_COLOR = 'rgba(255,107,43,1)'      // snap noktası artı işareti
const MARKER_SIZE = 5                          // Artı kolu uzunluğu (dünya px)

interface SnapIndicatorProps {
  snapTarget: SnapPoint
}

function SnapIndicator({ snapTarget }: SnapIndicatorProps) {
  const { x, y, seatX, seatY } = snapTarget

  // Highlight dairesinin yarıçapı — koltuğun biraz dışında
  const highlightRadius = SEAT_RADIUS * 1.5

  return (
    <Group listening={false}>
      {/* Snap olan koltuğun etrafında highlight dairesi */}
      <Circle
        x={seatX}
        y={seatY}
        radius={highlightRadius}
        fill="transparent"
        stroke={HIGHLIGHT_COLOR}
        strokeWidth={1.5}
        dash={[3, 3]}
        perfectDrawEnabled={false}
      />

      {/* Snap noktasında artı işareti */}
      <Line
        points={[x - MARKER_SIZE, y, x + MARKER_SIZE, y]}
        stroke={MARKER_COLOR}
        strokeWidth={1.5}
        perfectDrawEnabled={false}
      />
      <Line
        points={[x, y - MARKER_SIZE, x, y + MARKER_SIZE]}
        stroke={MARKER_COLOR}
        strokeWidth={1.5}
        perfectDrawEnabled={false}
      />

      {/* Snap noktası merkez nokta */}
      <Circle
        x={x}
        y={y}
        radius={2}
        fill={MARKER_COLOR}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}

export default memo(SnapIndicator)