'use client'

// Section drag kılavuz çizgileri
//
// 5 nokta üzerinden kılavuzlar çizilir:
//   4 bbox köşesi + 1 merkez
//   Her noktadan yatay (H) + dikey (V) → 10 çizgi
//
// Performans: RowDragGuides ile aynı pattern
//   RAF döngüsü → Konva node'ları imperatif güncelleme
//   React state sadece drag başı/sonu'nda (2 kez) set edilir

import { memo, useEffect, useRef, useState } from 'react'
import { Group, Line } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '@/store/editor.store'
import type { Section } from '@/store/types'

const GUIDE_COLOR = 'rgba(0, 200, 255, 0.40)'
const LINE_LENGTH = 100_000

interface SectionDragGuidesProps {
  stageRef: React.RefObject<Konva.Stage | null>
  isDraggingRef: React.RefObject<boolean>
  draggingSectionId: React.RefObject<string | null>
}

// Bbox hesabı — polygon ve rect için
function getSectionBBox(section: Section) {
  if (section.shape === 'rect') {
    return {
      x: section.x ?? 0,
      y: section.y ?? 0,
      w: section.width ?? 0,
      h: section.height ?? 0,
    }
  }
  const pts = section.points ?? []
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// 5 guide noktasını bbox'tan türet (section-local koordinat)
// Drag sırasında node offset ile otomatik taşınırlar
function getGuideOffsets(section: Section): Array<{ ox: number; oy: number }> {
  const b = getSectionBBox(section)
  return [
    { ox: b.x, oy: b.y },  // TL
    { ox: b.x + b.w, oy: b.y },  // TR
    { ox: b.x, oy: b.y + b.h },  // BL
    { ox: b.x + b.w, oy: b.y + b.h },  // BR
    { ox: b.x + b.w / 2, oy: b.y + b.h / 2 }, // Center
  ]
}

// Guide group içindeki H ve V çizgilerini imperatif güncelle
function updateGuideGroup(group: Konva.Group, worldX: number, worldY: number) {
  const lines = group.find('Line') as Konva.Line[]
  // 0 → yatay (H), 1 → dikey (V)
  if (lines[0]) lines[0].points([-LINE_LENGTH, worldY, LINE_LENGTH, worldY])
  if (lines[1]) lines[1].points([worldX, -LINE_LENGTH, worldX, LINE_LENGTH])
}

interface GuidePoint {
  key: string
  ox: number  // section-local offset X
  oy: number  // section-local offset Y
}

function SectionDragGuides({
  stageRef,
  isDraggingRef,
  draggingSectionId,
}: SectionDragGuidesProps) {
  const [guidePoints, setGuidePoints] = useState<GuidePoint[]>([])
  const groupRefs = useRef<Map<string, React.RefObject<Konva.Group | null>>>(new Map())
  const wasDragging = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const isDragging = isDraggingRef.current
      const stage = stageRef.current
      const sectionId = draggingSectionId.current

      // Drag başladı
      if (isDragging && !wasDragging.current) {
        wasDragging.current = true

        if (stage && sectionId) {
          const store = useEditorStore.getState()
          const floor = store.chart?.floors.find((f) => f.id === store.activeFloorId)
          const section = floor?.sections.find((s) => s.id === sectionId) as Section | undefined

          if (section) {
            const pts = getGuideOffsets(section).map((o, i) => ({
              key: `g${i}`,
              ox: o.ox,
              oy: o.oy,
            }))
            pts.forEach(({ key }) => {
              if (!groupRefs.current.has(key)) {
                groupRefs.current.set(key, { current: null })
              }
            })
            setGuidePoints(pts)
          }
        }
      }

      // Drag devam ediyor — guide'ları imperatif güncelle
      if (isDragging && stage && sectionId && guidePoints.length > 0) {
        const node = stage.findOne(`#${sectionId}`) as Konva.Node | undefined
        if (node) {
          const nodeX = node.x()
          const nodeY = node.y()
          for (const gp of guidePoints) {
            const ref = groupRefs.current.get(gp.key)
            const grp = ref?.current
            if (grp) {
              updateGuideGroup(grp, nodeX + gp.ox, nodeY + gp.oy)
            }
          }
          // Preview layer (index 3) batchDraw
          const layers = stage.getLayers()
            ; (layers[3] ?? layers[layers.length - 1])?.batchDraw()
        }
      }

      // Drag bitti
      if (!isDragging && wasDragging.current) {
        wasDragging.current = false
        groupRefs.current.clear()
        setGuidePoints([])
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, isDraggingRef, draggingSectionId, guidePoints])

  if (guidePoints.length === 0) return null

  return (
    <>
      {guidePoints.map((gp) => {
        let ref = groupRefs.current.get(gp.key)
        if (!ref) {
          ref = { current: null }
          groupRefs.current.set(gp.key, ref)
        }
        return (
          <Group key={gp.key} ref={ref} listening={false}>
            {/* Yatay kılavuz */}
            <Line
              points={[-LINE_LENGTH, 0, LINE_LENGTH, 0]}
              stroke={GUIDE_COLOR}
              strokeWidth={1}
              dash={[4, 6]}
              perfectDrawEnabled={false}
            />
            {/* Dikey kılavuz */}
            <Line
              points={[0, -LINE_LENGTH, 0, LINE_LENGTH]}
              stroke={GUIDE_COLOR}
              strokeWidth={1}
              dash={[4, 6]}
              perfectDrawEnabled={false}
            />
          </Group>
        )
      })}
    </>
  )
}

export default memo(SectionDragGuides)