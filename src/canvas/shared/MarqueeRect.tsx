'use client'

// Marquee seçim dikdörtgeni — drag sırasında canvas üzerinde görünür
//
// dragMode'a göre renk:
//   normal → --color-accent (turuncu)   yeni seçim
//   add    → mavi                       mevcut seçime ekle
//   remove → kırmızı                   mevcut seçimden çıkar
//
// Preview layer içinde render edilir (listening: false)
// Konva dünya koordinatlarında çizilir — zoom/pan'de otomatik ölçeklenir

import { memo } from 'react'
import { Rect } from 'react-konva'
import type { MarqueeRectType, MarqueeDragMode } from '@/hooks/useMarqueeSelect'

const MODE_COLORS: Record<MarqueeDragMode, { fill: string; stroke: string }> = {
  normal: { fill: 'rgba(247, 129, 102, 0.06)', stroke: 'rgba(247, 129, 102, 0.80)' },
  add: { fill: 'rgba(60,  140, 255, 0.06)', stroke: 'rgba(60,  140, 255, 0.80)' },
  remove: { fill: 'rgba(220,  60,  60, 0.06)', stroke: 'rgba(220,  60,  60, 0.80)' },
}

interface MarqueeRectProps {
  rect: MarqueeRectType
  dragMode: MarqueeDragMode
}

function MarqueeRect({ rect, dragMode }: MarqueeRectProps) {
  if (rect.width < 1 || rect.height < 1) return null

  const { fill, stroke } = MODE_COLORS[dragMode]

  return (
    <Rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={fill}
      stroke={stroke}
      strokeWidth={1}
      dash={[4, 3]}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

export default memo(MarqueeRect)