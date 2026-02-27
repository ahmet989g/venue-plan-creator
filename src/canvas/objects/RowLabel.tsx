'use client'

// Row etiket bileşeni — dünya koordinatlarında render edilir
//
// ID stratejisi:
//   ${row.id}-label-L ve ${row.id}-label-R ID'leri ile render edilir
//   useDragMove bu ID'leri bularak label'ları row ile birlikte imperatif taşır
//   → drag sırasında label'lar gizlenmez, row ile birlikte kayar
//
// isInteracting (sadece rotate):
//   Rotate sırasında store güncellenmez → label'lar eski pozisyonda kalır
//   Bu nedenle rotate süresince gizlenir, bitince güncel store değeriyle geri gelir
//   Drag sırasında isInteracting false → label'lar görünür ve imperatif taşınır

import { memo } from 'react'
import { Group, Text } from 'react-konva'
import { SEAT_RADIUS } from '@/lib/constants'
import { useTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editor.store'
import type { Row, Point } from '@/store/types'

const GAP = 8
const FONT_ROW = 14
const FONT_SECTION = 10
const LINE_GAP = 2
const TEXT_WIDTH = 120

interface RowLabelProps {
  row: Row
  worldFirst: Point
  worldLast: Point
  worldRotL: number
  worldRotR: number
}

function RowLabel({ row, worldFirst, worldLast, worldRotL, worldRotR }: RowLabelProps) {
  const { rowLabel = '', sectionLabel = '', rowLabelPosition } = row
  const { theme } = useTheme()
  const isInteracting = useEditorStore((s) => s.isInteracting)
  const isDark = theme === 'dark'

  if ((!rowLabel && !sectionLabel) || rowLabelPosition.length === 0) return null

  const showL = rowLabelPosition.includes('L')
  const showR = rowLabelPosition.includes('R')

  const colorRow = isDark ? '#e6edf3' : '#1f2328'
  const colorSection = isDark ? 'rgba(125,133,144,0.90)' : 'rgba(87,96,106,0.90)'
  const hasSection = Boolean(sectionLabel)
  const totalH = hasSection ? FONT_SECTION + LINE_GAP + FONT_ROW : FONT_ROW

  return (
    <>
      {showL && (
        <Group
          id={`${row.id}-label-L`}
          x={worldFirst.x}
          y={worldFirst.y}
          rotation={worldRotL}
          // Rotate sırasında gizle (store güncellenmediği için pozisyon kayar)
          // Drag sırasında gizlenmez — useDragMove imperatif taşır
          visible={!isInteracting}
          listening={false}
        >
          <LabelLines
            rowLabel={rowLabel}
            sectionLabel={sectionLabel}
            hasSection={hasSection}
            totalH={totalH}
            colorRow={colorRow}
            colorSection={colorSection}
            side="left"
          />
        </Group>
      )}

      {showR && (
        <Group
          id={`${row.id}-label-R`}
          x={worldLast.x}
          y={worldLast.y}
          rotation={worldRotR}
          visible={!isInteracting}
          listening={false}
        >
          <LabelLines
            rowLabel={rowLabel}
            sectionLabel={sectionLabel}
            hasSection={hasSection}
            totalH={totalH}
            colorRow={colorRow}
            colorSection={colorSection}
            side="right"
          />
        </Group>
      )}
    </>
  )
}

// ─── Tek taraf metin satırları ────────────────────────────────────────────────

interface LabelLinesProps {
  rowLabel: string
  sectionLabel: string
  hasSection: boolean
  totalH: number
  colorRow: string
  colorSection: string
  side: 'left' | 'right'
}

function LabelLines({ rowLabel, sectionLabel, hasSection, totalH, colorRow, colorSection, side }: LabelLinesProps) {
  const topY = -totalH / 2
  const isLeft = side === 'left'
  const xOffset = isLeft ? -(SEAT_RADIUS + GAP + TEXT_WIDTH) : SEAT_RADIUS + GAP
  const align: 'left' | 'right' = isLeft ? 'right' : 'left'

  return (
    <>
      {hasSection && (
        <Text
          x={xOffset}
          y={topY}
          text={sectionLabel}
          fontSize={FONT_SECTION}
          fontStyle="normal"
          fill={colorSection}
          width={TEXT_WIDTH}
          align={align}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {rowLabel && (
        <Text
          x={xOffset}
          y={topY + (hasSection ? FONT_SECTION + LINE_GAP : 0)}
          text={rowLabel}
          fontSize={FONT_ROW}
          fontStyle="bold"
          fill={colorRow}
          width={TEXT_WIDTH}
          align={align}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </>
  )
}

export default memo(RowLabel)