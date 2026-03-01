'use client'

// Row taşıma kılavuz çizgileri — sadece drag süresince görünür
//
// Performans stratejisi:
//   Drag devam ederken React state güncellenmez — kılavuz pozisyonları
//   drag başında hesaplanır ve Konva node'ları imperatif güncellenir.
//   setGuides sadece drag başı/sonu (2 kez) çağrılır → minimum re-render.
//
// Konva imperatif güncelleme:
//   guidesRef: GuideLines Group'larına ref — her frame node.x/y() direkt set edilir
//   Bu sayede React reconciler devreye girmez, smooth 60fps görünüm sağlanır

import { memo, useEffect, useRef, useState } from 'react'
import { Group } from 'react-konva'
import type Konva from 'konva'
import { Line } from 'react-konva'
import { useEditorStore } from '@/store/editor.store'
import type { Row } from '@/store/types'

const GUIDE_COLOR = 'rgba(0,200,255,0.40)'
const LINE_LENGTH = 100_000

interface GuideData {
  rowId: string
  angleDeg: number
  chord: number
}

interface RowDragGuidesProps {
  stageRef: React.RefObject<Konva.Stage | null>
  isDraggingRef: React.RefObject<boolean>
  draggingIdsRef: React.RefObject<string[]>
}

// Kılavuz çizgilerini Konva node'larına doğrudan yaz — React re-render yok
function updateGuideLines(
  groupRef: React.RefObject<Konva.Group | null>,
  node: Konva.Node,
  angleDeg: number,
  chord: number,
) {
  const group = groupRef.current
  if (!group) return

  const rad = angleDeg * (Math.PI / 180)
  const perpRad = rad + Math.PI / 2
  const nx = node.x()
  const ny = node.y()

  // firstX, firstY = ilk koltuk (node origin)
  // lastX,  lastY  = son koltuk
  // midX,   midY   = orta
  const lastX = nx + Math.cos(rad) * chord
  const lastY = ny + Math.sin(rad) * chord
  const midX = (nx + lastX) / 2
  const midY = (ny + lastY) / 2

  // Group içindeki Line'ları bul ve güncelle
  const lines = group.find('Line') as Konva.Line[]

  // Line sırası: 0=first-perp, 1=last-perp, 2=mid-parallel
  if (lines[0]) {
    lines[0].points([
      nx - Math.cos(perpRad) * LINE_LENGTH, ny - Math.sin(perpRad) * LINE_LENGTH,
      nx + Math.cos(perpRad) * LINE_LENGTH, ny + Math.sin(perpRad) * LINE_LENGTH,
    ])
  }
  if (lines[1]) {
    lines[1].points([
      lastX - Math.cos(perpRad) * LINE_LENGTH, lastY - Math.sin(perpRad) * LINE_LENGTH,
      lastX + Math.cos(perpRad) * LINE_LENGTH, lastY + Math.sin(perpRad) * LINE_LENGTH,
    ])
  }
  if (lines[2]) {
    lines[2].points([
      midX - Math.cos(rad) * LINE_LENGTH, midY - Math.sin(rad) * LINE_LENGTH,
      midX + Math.cos(rad) * LINE_LENGTH, midY + Math.sin(rad) * LINE_LENGTH,
    ])
  }
}

function RowDragGuides({ stageRef, isDraggingRef, draggingIdsRef }: RowDragGuidesProps) {
  const [guides, setGuides] = useState<GuideData[]>([])

  // Konva Group ref'leri — her row için imperatif güncelleme
  const groupRefs = useRef<Map<string, React.RefObject<Konva.Group | null>>>(new Map())

  const wasDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const isDragging = isDraggingRef.current
      const stage = stageRef.current

      // false → true: drag başladı
      if (isDragging && !wasDraggingRef.current) {
        wasDraggingRef.current = true

        if (stage) {
          const store = useEditorStore.getState()
          const floor = store.chart?.floors.find((f) => f.id === store.activeFloorId)

          if (floor) {
            const newGuides: GuideData[] = draggingIdsRef.current.flatMap((id) => {
              const row = floor.objects.find((o) => o.id === id) as Row | undefined
              if (!row || row.type !== 'row') return []
              return [{
                rowId: id,
                angleDeg: row.rotation,
                chord: (row.seats.length - 1) * row.seatSpacing,
              }]
            })

            // Her row için ref oluştur
            newGuides.forEach(({ rowId }) => {
              if (!groupRefs.current.has(rowId)) {
                groupRefs.current.set(rowId, { current: null })
              }
            })

            setGuides(newGuides)
          }
        }
      }

      // Drag devam ediyor — Konva node'larını imperatif güncelle (React state yok)
      if (isDragging && stage) {
        for (const guide of guides) {
          const rowNode = stage.findOne(`#${guide.rowId}`) as Konva.Node | undefined
          const groupRef = groupRefs.current.get(guide.rowId)
          if (rowNode && groupRef) {
            updateGuideLines(groupRef, rowNode, guide.angleDeg, guide.chord)
          }
        }
        stage.getLayers()[2]?.batchDraw()
      }

      // true → false: drag bitti
      if (!isDragging && wasDraggingRef.current) {
        wasDraggingRef.current = false
        groupRefs.current.clear()
        setGuides([])
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, isDraggingRef, draggingIdsRef, guides])

  if (guides.length === 0) return null

  return (
    <>
      {guides.map((g) => {
        // Ref al veya oluştur
        let ref = groupRefs.current.get(g.rowId)
        if (!ref) {
          ref = { current: null }
          groupRefs.current.set(g.rowId, ref)
        }

        return (
          <Group key={g.rowId} ref={ref} listening={false}>
            {/* İlk koltuk — dik (perp) */}
            <Line
              points={[0, -LINE_LENGTH, 0, LINE_LENGTH]}
              stroke={GUIDE_COLOR}
              strokeWidth={1}
              dash={[4, 6]}
              perfectDrawEnabled={false}
            />
            {/* Son koltuk — dik (perp) */}
            <Line
              points={[0, -LINE_LENGTH, 0, LINE_LENGTH]}
              stroke={GUIDE_COLOR}
              strokeWidth={1}
              dash={[4, 6]}
              perfectDrawEnabled={false}
            />
            {/* Orta — paralel */}
            <Line
              points={[-LINE_LENGTH, 0, LINE_LENGTH, 0]}
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

export default memo(RowDragGuides)