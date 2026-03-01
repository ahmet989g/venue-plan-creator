'use client'

// Seçim katmanı — Konva Transformer + RowResizeHandle
//
// Kritik kural:
//   handleTransform  → SADECE batchDraw, store'a yazma
//   handleTransformEnd → store'a yaz, node'u sıfırla
//
// Section rotate:
//   Polygon → tüm points centroid etrafında döndürülür, node.rotation sıfırlanır
//   Rect    → section.x / section.y node offset ile güncellenir
//
// Transformer node attach:
//   RAF ile beklenir — SectionLayer React render'ı bitmeden önce
//   stage.findOne hem ObjectLayer hem SectionLayer'da arar

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Layer, Transformer, Group } from 'react-konva'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import RowResizeHandle from '@/canvas/tools/row/RowResizeHandle'
import type { Row } from '@/store/types'

const SNAP_ANGLES = Array.from({ length: 25 }, (_, i) => i * 15)

// Polygon noktalarını merkez etrafında döndür
function rotatePoints(
  points: { x: number; y: number }[],
  cx: number, cy: number,
  angleDeg: number,
) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return points.map((p) => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
  }))
}

function getCentroid(points: { x: number; y: number }[]) {
  const n = points.length
  const s = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  return { x: s.x / n, y: s.y / n }
}

interface SelectionLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>
  isDraggingRef: React.RefObject<boolean>
}

export default function SelectionLayer({ stageRef, isDraggingRef }: SelectionLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const rafRef = useRef<number | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [isShiftDown, setIsShiftDown] = useState(false)

  const { selectedObjectIds, activeFloor } = useEditorStore(
    useShallow((s) => ({
      selectedObjectIds: s.selectedObjectIds,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
    })),
  )

  const isInteracting = useEditorStore((s) => s.isInteracting)

  // Store action ref — effect dependency olmadan güncel kalır
  const actionsRef = useRef({
    updateObject: useEditorStore.getState().updateObject,
    updateSection: useEditorStore.getState().updateSection,
    pushHistory: useEditorStore.getState().pushHistory,
    setInteracting: useEditorStore.getState().setInteracting,
  })

  useEffect(() =>
    useEditorStore.subscribe((s) => {
      actionsRef.current.updateObject = s.updateObject
      actionsRef.current.updateSection = s.updateSection
      actionsRef.current.pushHistory = s.pushHistory
      actionsRef.current.setInteracting = s.setInteracting
    })
    , [])

  // Shift key snap
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(false) }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Seçili row'lar — resize handle için
  const selectedRows = useMemo(
    () => (activeFloor?.objects ?? []).filter(
      (o): o is Row => o.type === 'row' && selectedObjectIds.includes(o.id),
    ),
    [activeFloor, selectedObjectIds],
  )

  // ─── Transformer node attach ───────────────────────────────────────────────
  // RAF zorunlu: SectionLayer'ın React render'ı bitmeden stage.findOne çalışırsa
  // section Group node'unu bulamaz → Transformer boş kalır
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // Double RAF: ilk frame React-Konva render'ı bitirir, ikinci frame node'ları stage'e commit eder
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        const tr = transformerRef.current
        const stage = stageRef.current
        if (!tr || !stage) return

        if (selectedObjectIds.length === 0) {
          tr.nodes([])
          tr.getLayer()?.batchDraw()
          return
        }

        const nodes = selectedObjectIds
          .map((id) => stage.findOne<Konva.Node>(`#${id}`))
          .filter((n): n is Konva.Node => Boolean(n))

        tr.nodes(nodes)
        tr.forceUpdate()
        tr.getLayer()?.batchDraw()
      })
    })

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [selectedObjectIds, stageRef])

  // isDragging → isMoving (handle gizleme)
  useEffect(() => {
    let raf: number
    const tick = () => { setIsMoving(isDraggingRef.current); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isDraggingRef])

  // ─── Transform handlers ────────────────────────────────────────────────────

  const handleTransformStart = useCallback(() => {
    actionsRef.current.setInteracting(true)
  }, [])

  // SADECE batchDraw — store'a yazma, Transformer'ın kendi görsel güncellemesi yeterli
  const handleTransform = useCallback(() => {
    transformerRef.current?.getLayer()?.batchDraw()
  }, [])

  const handleTransformEnd = useCallback(() => {
    const tr = transformerRef.current
    if (!tr) return

    const { updateObject, updateSection, pushHistory, setInteracting } = actionsRef.current
    const state = useEditorStore.getState()
    const floor = state.chart?.floors.find((f) => f.id === state.activeFloorId)

    for (const node of tr.nodes()) {
      const id = node.id()
      if (!id) continue

      // Section mı?
      const section = floor?.sections.find((s) => s.id === id)

      if (section) {
        if (section.shape === 'polygon' && section.points?.length) {
          const rot = node.rotation()
          const dx = node.x()
          const dy = node.y()

          // 1) Section noktalarını taşı + döndür
          const translated = section.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
          const centroid = getCentroid(translated)
          const rotated = rot !== 0
            ? rotatePoints(translated, centroid.x, centroid.y, rot)
            : translated

          updateSection(id, { points: rotated })

          // 2) Section içindeki row'ları da aynı transform ile güncelle
          // Row önizleme rotate ile hareket eder ama row.x/y güncellenmezse geri döner
          for (const objId of section.objectIds) {
            const obj = floor?.objects.find((o) => o.id === objId)
            if (!obj || obj.type !== 'row') continue
            const row = obj as import('@/store/types').Row
            // Önce node offset uygula, sonra centroid etrafında döndür
            const tx = row.x + dx
            const ty = row.y + dy
            const rad = (rot * Math.PI) / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const nx = centroid.x + (tx - centroid.x) * cos - (ty - centroid.y) * sin
            const ny = centroid.y + (tx - centroid.x) * sin + (ty - centroid.y) * cos
            updateObject(objId, {
              x: nx,
              y: ny,
              rotation: (row.rotation + rot) % 360,
            } as Partial<import('@/store/types').Row>)
          }

        } else if (section.shape === 'rect') {
          updateSection(id, {
            x: (section.x ?? 0) + node.x(),
            y: (section.y ?? 0) + node.y(),
          })
        }

        // Node'u sıfırla — store'a yazıldı
        node.x(0)
        node.y(0)
        node.rotation(0)

      } else {
        // Row veya diğer objeler — direkt x/y/rotation
        updateObject(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        } as Partial<Row>)
      }
    }

    pushHistory()
    setInteracting(false)
  }, [])

  const hideHandles = isMoving || isInteracting

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        resizeEnabled={false}
        rotateEnabled={true}
        rotateAnchorOffset={28}
        rotationSnaps={isShiftDown ? SNAP_ANGLES : []}
        rotationSnapTolerance={8}
        borderStroke="#f78166"
        borderStrokeWidth={1.5}
        borderDash={[4, 3]}
        anchorSize={0}
        padding={6}
        anchorStyleFunc={(anchor) => {
          if (anchor.hasName('rotater')) {
            anchor.fill('#f78166')
            anchor.stroke('#ffffff')
            anchor.strokeWidth(1.5)
            anchor.cornerRadius(6)
            anchor.width(12)
            anchor.height(12)
            anchor.offsetX(6)
          }
        }}
        onTransformStart={handleTransformStart}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />

      {/* Row resize handle'ları — drag veya rotate sırasında gizlenir */}
      {!hideHandles && selectedRows.map((row) => (
        <Group key={row.id}>
          <RowResizeHandle
            row={row}
            side="left"
            selectedRows={selectedRows}
            stageRef={stageRef}
          />
          <RowResizeHandle
            row={row}
            side="right"
            selectedRows={selectedRows}
            stageRef={stageRef}
          />
        </Group>
      ))}
    </Layer>
  )
}