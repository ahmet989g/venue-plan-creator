'use client'

// Reusable kılavuz çizgileri bileşeni
// Verilen noktadan geçen, açıya göre dönen paralel ve/veya dik çizgiler
// Row preview, taşıma, boyutlandırma ve rotate işlemlerinde kullanılır
// listening: false — mouse event'leri geçirir

import { memo } from 'react'
import { Group, Line } from 'react-konva'
import type { Point } from '@/store/types'

// Canvas'ı aşacak kadar uzun — "sonsuz" görünüm için
const LINE_LENGTH = 100_000

interface GuideLinesProps {
  point: Point     // Çizgilerin geçeceği merkez nokta
  angleDeg: number    // Paralel çizginin açısı (derece)
  showParallel?: boolean   // Row yönünde uzanan çizgi
  showPerpendicular?: boolean // Row'a dik çizgi
  parallelColor?: string
  perpendicularColor?: string
}

function GuideLines({
  point,
  angleDeg,
  showParallel = true,
  showPerpendicular = true,
  parallelColor = 'rgba(0,200,255,0.35)',
  perpendicularColor = 'rgba(0,200,255,0.35)',
}: GuideLinesProps) {
  const rad = angleDeg * (Math.PI / 180)
  const perpRad = rad + Math.PI / 2

  // Paralel çizgi — row yönünde
  const parallelPoints = [
    point.x - Math.cos(rad) * LINE_LENGTH,
    point.y - Math.sin(rad) * LINE_LENGTH,
    point.x + Math.cos(rad) * LINE_LENGTH,
    point.y + Math.sin(rad) * LINE_LENGTH,
  ]

  // Dik çizgi — row'a 90° dik
  const perpPoints = [
    point.x - Math.cos(perpRad) * LINE_LENGTH,
    point.y - Math.sin(perpRad) * LINE_LENGTH,
    point.x + Math.cos(perpRad) * LINE_LENGTH,
    point.y + Math.sin(perpRad) * LINE_LENGTH,
  ]

  return (
    <Group listening={false}>
      {showParallel && (
        <Line
          points={parallelPoints}
          stroke={parallelColor}
          strokeWidth={1}
          dash={[4, 6]}
          perfectDrawEnabled={false}
        />
      )}
      {showPerpendicular && (
        <Line
          points={perpPoints}
          stroke={perpendicularColor}
          strokeWidth={1}
          dash={[4, 6]}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  )
}

export default memo(GuideLines)