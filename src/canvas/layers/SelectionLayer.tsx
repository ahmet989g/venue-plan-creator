'use client'

// Seçim katmanı — Konva Transformer + RowResizeHandle
// Drag sırasında handle'lar gizlenir
// Transformer re-attach: RAF ile her render sonrası

import { useRef, useEffect, useMemo, useState } from 'react'
import { Layer, Transformer, Group } from 'react-konva'
import type Konva from 'konva'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/store/editor.store'
import RowResizeHandle from '@/canvas/objects/RowResizeHandle'
import type { Row } from '@/store/types'

interface SelectionLayerProps {
  stageRef: React.RefObject<Konva.Stage | null>
  isDraggingRef: React.RefObject<boolean>
}

export default function SelectionLayer({ stageRef, isDraggingRef }: SelectionLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const [isMoving, setIsMoving] = useState(false)

  const { selectedObjectIds, activeFloor } = useEditorStore(
    useShallow((s) => ({
      selectedObjectIds: s.selectedObjectIds,
      activeFloor: s.chart?.floors.find((f) => f.id === s.activeFloorId) ?? null,
    })),
  )

  const selectedRows = useMemo(
    () => (activeFloor?.objects ?? []).filter(
      (o): o is Row => o.type === 'row' && selectedObjectIds.includes(o.id),
    ),
    [activeFloor, selectedObjectIds],
  )

  // Drag başlayınca handle'ları gizle, bitince göster
  useEffect(() => {
    const checkDrag = setInterval(() => {
      if (isDraggingRef.current !== isMoving) {
        setIsMoving(isDraggingRef.current)
      }
    }, 16)
    return () => clearInterval(checkDrag)
  }, [isDraggingRef, isMoving])

  // Transformer her render sonrası RAF ile yenile
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

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        resizeEnabled={false}
        rotateEnabled={false}
        borderStroke="#f78166"
        borderStrokeWidth={1.5}
        borderDash={[4, 3]}
        anchorSize={0}
        padding={0}
      />

      {/* Drag sırasında handle'lar gizlenir */}
      {!isMoving && selectedRows.map((row) => (
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