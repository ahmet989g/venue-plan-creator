'use client'

// Row çizim önizlemesi
// idle:    cursor koltuk + crosshair kılavuz çizgileri
// drawing: koltuk dizisi + adet etiketi + açıya göre kılavuz çizgileri
//          shift: yeşil paralel çizgi + arc açı göstergesi
// seatSpacing store'dan gelir — preview her zaman güncel değeri yansıtır

import { memo } from 'react'
import { Group, Circle, Line, Text, Rect, Arc } from 'react-konva'
import { calcSeatPositions, angle, distance } from '@/lib/geometry'
import { SEAT_RADIUS } from '@/lib/constants'
import GuideLines from '@/canvas/shared/GuideLines'
import SnapIndicator from '@/canvas/shared/SnapIndicator'
import type { RowToolState } from '@/canvas/tools/row/RowTool'
import type { SnapPoint } from '@/lib/snapPoints'

const GUIDE_DEFAULT = 'rgba(0,200,255,0.35)'
const GUIDE_SHIFT = 'rgba(100,220,100,0.7)'
const PREVIEW_FILL = 'rgba(0,200,255,0.2)'
const PREVIEW_STROKE = 'rgba(0,200,255,0.7)'

interface RowPreviewProps {
  toolState: RowToolState
  snapTarget: SnapPoint | null
  scale: number
  seatSpacing: number   // Store'dan gelir — hardcoded değil
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function RowPreview({ toolState, snapTarget, scale, seatSpacing }: RowPreviewProps) {
  const { step, startPoint, snappedEnd, seatCount, isAngleSnapped } = toolState

  if (!snappedEnd) return null

  const sw = 1

  // --- idle: tek koltuk + crosshair ---
  if (step === 'idle') {
    return (
      <Group listening={false}>
        <GuideLines
          point={snappedEnd}
          angleDeg={0}
          showParallel
          showPerpendicular
          parallelColor={GUIDE_DEFAULT}
          perpendicularColor={GUIDE_DEFAULT}
        />
        <Circle
          x={snappedEnd.x}
          y={snappedEnd.y}
          radius={SEAT_RADIUS}
          fill={PREVIEW_FILL}
          stroke={PREVIEW_STROKE}
          strokeWidth={sw}
          perfectDrawEnabled={false}
        />
        {snapTarget && <SnapIndicator snapTarget={snapTarget} />}
      </Group>
    )
  }

  // --- drawing ---
  if (step === 'drawing' && startPoint) {
    // seatSpacing prop'tan gelir — store güncellenince preview anında değişir
    const positions = calcSeatPositions(startPoint, snappedEnd, seatSpacing)
    const lastPos = positions[positions.length - 1] ?? snappedEnd
    const rowAngleDeg = normalizeDeg(angle(startPoint, snappedEnd) * (180 / Math.PI))
    const theta = angle(startPoint, snappedEnd)

    const parallelColor = isAngleSnapped ? GUIDE_SHIFT : GUIDE_DEFAULT

    // Koltuk adedi etiketi
    const label = String(seatCount)
    const fs = Math.max(10, 12 / scale)
    const pad = 4 / scale
    const labelW = label.length * fs * 0.7 + pad * 2
    const labelH = fs + pad * 2
    const perpOffset = SEAT_RADIUS + labelH / 2 + 2 / scale
    const perpX = -Math.sin(theta) * perpOffset
    const perpY = Math.cos(theta) * perpOffset
    const midPos = positions[Math.floor(positions.length / 2)] ?? startPoint

    // Açı göstergesi
    const dist = distance(startPoint, snappedEnd)
    const arcRadius = Math.min(60, Math.max(20, dist * 0.25))
    const arcMidRad = (rowAngleDeg / 2) * (Math.PI / 180)
    const arcLabelDist = arcRadius + 16 / scale
    const arcLabelX = startPoint.x + Math.cos(arcMidRad) * arcLabelDist
    const arcLabelY = startPoint.y + Math.sin(arcMidRad) * arcLabelDist
    const angleStr = `${Math.round(rowAngleDeg)}°`
    const angleLabelFs = Math.max(9, 10 / scale)
    const angleLabelW = angleStr.length * angleLabelFs * 0.65 + 6 / scale
    const angleLabelH = angleLabelFs + 4 / scale

    return (
      <Group listening={false}>
        {/* İlk koltuk kılavuz çizgileri */}
        <GuideLines
          point={startPoint}
          angleDeg={rowAngleDeg}
          showParallel
          showPerpendicular
          parallelColor={parallelColor}
          perpendicularColor={GUIDE_DEFAULT}
        />

        {/* Son koltuk — sadece dik */}
        {positions.length > 1 && (
          <GuideLines
            point={lastPos}
            angleDeg={rowAngleDeg}
            showParallel={false}
            showPerpendicular
            perpendicularColor={GUIDE_DEFAULT}
          />
        )}

        {/* Row kılavuz çizgisi */}
        <Line
          points={[startPoint.x, startPoint.y, snappedEnd.x, snappedEnd.y]}
          stroke="rgba(0,200,255,0.3)"
          strokeWidth={sw}
          dash={[4, 4]}
          perfectDrawEnabled={false}
        />

        {/* Önizleme koltukları */}
        {positions.map((pos, i) => (
          <Circle
            key={i}
            x={pos.x}
            y={pos.y}
            radius={SEAT_RADIUS}
            fill={PREVIEW_FILL}
            stroke={PREVIEW_STROKE}
            strokeWidth={sw}
            perfectDrawEnabled={false}
          />
        ))}

        {/* Koltuk adedi etiketi — ortada */}
        <Group x={midPos.x + perpX} y={midPos.y + perpY}>
          <Rect
            x={-labelW / 2}
            y={-labelH / 2}
            width={labelW}
            height={labelH}
            fill="rgba(0,0,0,0.55)"
            cornerRadius={3 / scale}
            perfectDrawEnabled={false}
          />
          <Text
            text={label}
            fontSize={fs}
            fill="rgba(255,255,255,0.85)"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            width={labelW}
            height={labelH}
            offsetX={labelW / 2}
            offsetY={labelH / 2}
            perfectDrawEnabled={false}
          />
        </Group>

        {/* Açı göstergesi — shift */}
        {isAngleSnapped && (
          <Group>
            <Line
              points={[startPoint.x, startPoint.y, startPoint.x + arcRadius * 1.5, startPoint.y]}
              stroke="rgba(100,220,100,0.5)"
              strokeWidth={sw}
              dash={[3, 3]}
              perfectDrawEnabled={false}
            />
            <Arc
              x={startPoint.x}
              y={startPoint.y}
              innerRadius={0}
              outerRadius={arcRadius}
              angle={rowAngleDeg}
              rotation={0}
              fill="rgba(100,220,100,0.12)"
              stroke="rgba(100,220,100,0.6)"
              strokeWidth={sw}
              perfectDrawEnabled={false}
            />
            <Group x={arcLabelX} y={arcLabelY}>
              <Rect
                x={-angleLabelW / 2}
                y={-angleLabelH / 2}
                width={angleLabelW}
                height={angleLabelH}
                fill="rgba(60,180,60,0.9)"
                cornerRadius={2 / scale}
                perfectDrawEnabled={false}
              />
              <Text
                text={angleStr}
                fontSize={angleLabelFs}
                fill="#ffffff"
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                width={angleLabelW}
                height={angleLabelH}
                offsetX={angleLabelW / 2}
                offsetY={angleLabelH / 2}
                perfectDrawEnabled={false}
              />
            </Group>
          </Group>
        )}

        {snapTarget && <SnapIndicator snapTarget={snapTarget} />}
      </Group>
    )
  }

  return null
}

export default memo(RowPreview)