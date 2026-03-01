'use client'

// Section çizim önizlemesi — listening: false katmanda render edilir
//
// Polygon:
//   idle    → cursor dairesi
//   drawing → tamamlanmış köşeler + cursor'a açık kenar
//   Shift   → yeşil renk + snap noktası göstergesi
//
// Rect:
//   idle    → cursor dairesi
//   drawing → start'tan cursor'a yarı saydam Rect
//   Shift   → kare önizlemesi

import { memo } from 'react'
import { Group, Circle, Line, Rect } from 'react-konva'
import type {
  PolygonToolState,
  RectToolState,
  SectionToolState,
} from '@/canvas/tools/section/SectionTool'

const PREVIEW_COLOR = 'rgba(247, 129, 102, 0.85)'
const PREVIEW_FILL = 'rgba(247, 129, 102, 0.08)'
const SNAP_COLOR = 'rgba(100, 220, 100, 0.9)'    // Shift aktifken
const CURSOR_RADIUS = 5

interface SectionPreviewProps {
  toolState: SectionToolState
  scale: number
}

// ─── Polygon Preview ──────────────────────────────────────────────────────────

function PolygonPreview({ state, scale }: { state: PolygonToolState; scale: number }) {
  if (!state || !state.cursor) return null

  const { step, points, cursor, snappedCursor, isClosable, isShiftSnapped } = state

  // Önizlemede kullanılacak efektif cursor — shift varsa snapped
  const effectiveCursor = snappedCursor ?? cursor

  const sw = Math.max(0.5, 1.5 / scale)
  const edgeColor = isShiftSnapped ? SNAP_COLOR : PREVIEW_COLOR
  const closureColor = isClosable ? SNAP_COLOR : edgeColor

  // idle → sadece cursor dairesi
  if (step === 'idle') {
    return (
      <Circle
        x={cursor.x}
        y={cursor.y}
        radius={CURSOR_RADIUS / scale}
        fill={PREVIEW_COLOR}
        listening={false}
        perfectDrawEnabled={false}
      />
    )
  }

  if (!points || points.length === 0) return null

  const lastPt = points[points.length - 1]
  if (!lastPt) return null

  const edgeFlat = points.flatMap((p) => [p.x, p.y])
  const edgeToCursor = [lastPt.x, lastPt.y, effectiveCursor.x, effectiveCursor.y]

  return (
    <Group listening={false}>
      {/* Tamamlanmış kenarlar */}
      {points.length >= 2 && (
        <Line
          points={edgeFlat}
          stroke={PREVIEW_COLOR}
          strokeWidth={sw}
          closed={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Cursor'a açık kenar — shift varsa yeşil */}
      <Line
        points={edgeToCursor}
        stroke={closureColor}
        strokeWidth={sw}
        dash={isClosable ? undefined : [5 / scale, 3 / scale]}
        perfectDrawEnabled={false}
      />

      {/* Köşe noktaları */}
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={(i === 0 ? CURSOR_RADIUS * 1.4 : CURSOR_RADIUS * 0.8) / scale}
          fill={i === 0 ? closureColor : PREVIEW_COLOR}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}

      {/* Cursor dairesi — efektif konumda */}
      <Circle
        x={effectiveCursor.x}
        y={effectiveCursor.y}
        radius={CURSOR_RADIUS / scale}
        fill={closureColor}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}

// ─── Rect Preview ─────────────────────────────────────────────────────────────

function RectPreview({ state, scale }: { state: RectToolState; scale: number }) {
  if (!state || !state.cursor) return null

  const { step, startPoint, cursor, isShiftSnapped } = state
  const sw = Math.max(0.5, 1.5 / scale)
  const strokeColor = isShiftSnapped ? SNAP_COLOR : PREVIEW_COLOR

  if (step !== 'drawing' || !startPoint) {
    return (
      <Circle
        x={cursor.x}
        y={cursor.y}
        radius={CURSOR_RADIUS / scale}
        fill={PREVIEW_COLOR}
        listening={false}
        perfectDrawEnabled={false}
      />
    )
  }

  const x = Math.min(startPoint.x, cursor.x)
  const y = Math.min(startPoint.y, cursor.y)
  const w = Math.abs(cursor.x - startPoint.x)
  const h = Math.abs(cursor.y - startPoint.y)

  return (
    <Rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={PREVIEW_FILL}
      stroke={strokeColor}
      strokeWidth={sw}
      dash={[6 / scale, 4 / scale]}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

function SectionPreview({ toolState, scale }: SectionPreviewProps) {
  if (!toolState || !toolState.mode) return null

  if (toolState.mode === 'polygon') {
    return <PolygonPreview state={toolState} scale={scale} />
  }

  if (toolState.mode === 'rect') {
    return <RectPreview state={toolState} scale={scale} />
  }

  return null
}

export default memo(SectionPreview)