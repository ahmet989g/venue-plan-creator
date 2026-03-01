'use client'

// Section Curve Editor — polygon kenarları için bezier anchor'ları
//
// Her kenar için:
//   • Dolu daire anchor — kontrol noktasını sürükle → bezier eğrisi
//   • İnce kesik çizgi  — köşe → kontrol noktası görsel bağlantısı
//
// Sadece section.curveEditMode = true iken render edilir.
// Anchor sürükleme → updateSectionEdge → store → SectionShape re-render.

import { memo, useCallback } from 'react'
import { Group, Circle, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore } from '@/store/editor.store'
import { useShallow } from 'zustand/react/shallow'
import type { Section, SectionEdge } from '@/store/types'

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ANCHOR_RADIUS = 6
const ANCHOR_FILL = '#ffffff'
const ANCHOR_STROKE = '#3b82f6'      // mavi — dikkat çekici
const ANCHOR_STROKE_W = 2
const ANCHOR_HOVER_FILL = '#3b82f6'
const GUIDE_STROKE = 'rgba(59,130,246,0.45)'
const GUIDE_STROKE_W = 1
const GUIDE_DASH = [4, 4]
const CURVED_MARKER_FILL = '#3b82f6'     // curved edge anchor → mavi dolu
const STRAIGHT_MARKER_FILL = '#ffffff'    // düz edge anchor → beyaz

interface SectionCurveEditorProps {
  section: Section
  scale: number          // Konva stage scale — anchor boyutunu normalize eder
}

// Midpoint helper
function mid(ax: number, ay: number, bx: number, by: number) {
  return { x: (ax + bx) / 2, y: (ay + by) / 2 }
}

// Default edge — points[i] → points[(i+1)%n] orta noktasında cp
function getEdge(section: Section, i: number): SectionEdge {
  const pts = section.points ?? []
  const n = pts.length
  const a = pts[i]
  const b = pts[(i + 1) % n]
  const existing = section.edges?.[i]
  if (existing) return existing
  const m = mid(a.x, a.y, b.x, b.y)
  return { isCurved: false, cpx: m.x, cpy: m.y }
}

function SectionCurveEditorInner({ section, scale }: SectionCurveEditorProps) {
  const updateSectionEdge = useEditorStore((s) => s.updateSectionEdge)

  const pts = section.points ?? []
  const n = pts.length
  if (n < 2) return null

  // Scale-normalized anchor radius — zoom değişse de 6px görünür
  const r = ANCHOR_RADIUS / scale

  return (
    <Group listening={true}>
      {pts.map((pt, i) => {
        const next = pts[(i + 1) % n]
        const edge = getEdge(section, i)
        const { cpx, cpy, isCurved } = edge

        // Anchor sürükleme — cp koordinatlarını store'a yaz
        const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
          e.cancelBubble = true
          updateSectionEdge(section.id, i, {
            cpx: e.target.x(),
            cpy: e.target.y(),
            isCurved: true,   // Sürüklenince otomatik curved olur
          })
        }

        // Anchor double-click → düz çizgiye döndür (cp'yi orta noktaya sıfırla)
        const handleDblClick = (e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          const m = mid(pt.x, pt.y, next.x, next.y)
          updateSectionEdge(section.id, i, {
            isCurved: false,
            cpx: m.x,
            cpy: m.y,
          })
        }

        return (
          <Group key={i}>
            {/* ── Köşe → CP kılavuz çizgileri (sadece curved edge'de) ── */}
            {isCurved && (
              <>
                <Line
                  points={[pt.x, pt.y, cpx, cpy]}
                  stroke={GUIDE_STROKE}
                  strokeWidth={GUIDE_STROKE_W / scale}
                  dash={GUIDE_DASH}
                  listening={false}
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[next.x, next.y, cpx, cpy]}
                  stroke={GUIDE_STROKE}
                  strokeWidth={GUIDE_STROKE_W / scale}
                  dash={GUIDE_DASH}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              </>
            )}

            {/* ── Kontrol noktası anchor ── */}
            <Circle
              x={cpx}
              y={cpy}
              radius={r}
              fill={isCurved ? CURVED_MARKER_FILL : STRAIGHT_MARKER_FILL}
              stroke={ANCHOR_STROKE}
              strokeWidth={ANCHOR_STROKE_W / scale}
              draggable={true}
              onDragMove={handleDragMove}
              onDblClick={handleDblClick}
              onMouseEnter={(e) => {
                const node = e.target
                node.fill(ANCHOR_HOVER_FILL)
                node.getLayer()?.batchDraw()
                const container = node.getStage()?.container()
                if (container) container.style.cursor = 'crosshair'
              }}
              onMouseLeave={(e) => {
                const node = e.target
                node.fill(isCurved ? CURVED_MARKER_FILL : STRAIGHT_MARKER_FILL)
                node.getLayer()?.batchDraw()
                const container = node.getStage()?.container()
                if (container) container.style.cursor = 'default'
              }}
              perfectDrawEnabled={false}
            />
          </Group>
        )
      })}
    </Group>
  )
}

export default memo(SectionCurveEditorInner)