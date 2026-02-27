'use client'

// Seçim katmanı — Konva Transformer + RowResizeHandle + Rotation
//
// isInteracting (rotate):
//   setInteracting(true)  → onTransformStart
//   setInteracting(false) → onTransformEnd
//   Hem label'lar hem handle'lar bu flag ile gizlenir
//   → rotate sırasında handle'lar eski pozisyonda kalmaz
//
// Drag sırasında handle gizleme:
//   isDraggingRef → isMoving state → handle'lar gizlenir
//
// Shift+rotate snap:
//   rotationSnaps prop'u ile Konva internal snap — node kayması yok
//
// Handle gizleme koşulu: isMoving || isInteracting

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Layer, Transformer, Group } from 'react-konva'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import RowResizeHandle from '@/canvas/objects/RowResizeHandle'
import type { Row } from '@/store/types'

const SNAP_ANGLES = Array.from({ length: 25 }, (_, i) => i * 15)

interface SelectionLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>
  isDraggingRef: React.RefObject<boolean>
}

export default function SelectionLayer({ stageRef, isDraggingRef }: SelectionLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [isShiftDown, setIsShiftDown] = useState(false)

  const { selectedObjectIds, activeFloor } = useEditorStore(
    useShallow((s) => ({
      selectedObjectIds: s.selectedObjectIds,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
    })),
  )

  // isInteracting — rotate başı/sonu için
  const isInteracting = useEditorStore((s) => s.isInteracting)

  const storeActionsRef = useRef({
    updateObject: useEditorStore.getState().updateObject,
    pushHistory: useEditorStore.getState().pushHistory,
    setInteracting: useEditorStore.getState().setInteracting,
  })
  useEffect(() => {
    return useEditorStore.subscribe((s) => {
      storeActionsRef.current.updateObject = s.updateObject
      storeActionsRef.current.pushHistory = s.pushHistory
      storeActionsRef.current.setInteracting = s.setInteracting
    })
  }, [])

  // Shift key state — rotationSnaps reaktif güncellenir
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(true) }
    const onUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(false) }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const selectedRows = useMemo(
    () => (activeFloor?.objects ?? []).filter(
      (o): o is Row => o.type === 'row' && selectedObjectIds.includes(o.id),
    ),
    [activeFloor, selectedObjectIds],
  )

  // Drag sırasında handle gizleme — 16ms polling
  useEffect(() => {
    const check = setInterval(() => {
      if (isDraggingRef.current !== isMoving) setIsMoving(isDraggingRef.current)
    }, 16)
    return () => clearInterval(check)
  }, [isDraggingRef, isMoving])

  // Transformer node attach — her render sonrası RAF ile
  useEffect(() => {
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return

    if (selectedObjectIds.length === 0) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const raf = requestAnimationFrame(() => {
      const nodes = selectedObjectIds
        .map((id) => stage.findOne(`#${id}`))
        .filter((node): node is Konva.Node => node !== undefined)
      transformer.nodes(nodes)
      transformer.forceUpdate()
      transformer.getLayer()?.batchDraw()
    })

    return () => cancelAnimationFrame(raf)
  })

  // Rotate başladı — label + handle'ları gizle
  const handleTransformStart = useCallback(() => {
    storeActionsRef.current.setInteracting(true)
  }, [])

  // Rotate devam ediyor — Konva rotationSnaps ile snap uygulanır, store'a yazılmaz
  const handleTransform = useCallback(() => {
    transformerRef.current?.getLayer()?.batchDraw()
  }, [])

  // Rotate bitti — store'a yaz, label + handle'ları göster
  const handleTransformEnd = useCallback(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    const { updateObject, pushHistory, setInteracting } = storeActionsRef.current

    for (const node of transformer.nodes()) {
      const id = node.id()
      if (!id) continue
      updateObject(id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      })
    }

    pushHistory()
    // Label + handle'lar görünür — store güncel, doğru pozisyonda render olur
    setInteracting(false)
  }, [])

  // Handle'lar gizlenme koşulu: drag VEYA rotate sırasında
  const hideHandles = isMoving || isInteracting

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        resizeEnabled={false}
        rotateEnabled
        rotateAnchorOffset={24}
        // Shift basılıyken 15° snap — Konva internal, node.rotation() override yok
        rotationSnaps={isShiftDown ? SNAP_ANGLES : []}
        rotationSnapTolerance={8}
        borderStroke="#f78166"
        borderStrokeWidth={1.5}
        borderDash={[4, 3]}
        anchorSize={0}
        padding={0}
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

      {/* Drag veya rotate sırasında handle'lar gizlenir */}
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