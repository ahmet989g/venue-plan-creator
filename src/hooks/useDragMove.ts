'use client'

// Global obje taşıma hook'u — Row, Table, Booth vb. tüm tipler kullanır
//
// Label (aux) node stratejisi:
//   Her row için ${id}-label-L ve ${id}-label-R node'ları da snapshot'a eklenir
//   Drag sırasında row ile birlikte imperatif taşınır → label'lar row'u takip eder
//   mouseUp'ta sadece ana row'lar (isAux=false) store'a yazılır
//   isInteracting ÇAĞRILMAZ — label'lar drag sırasında görünür kalır
//
// NOT: React Konva her re-render'da prop'lardan node pozisyonunu resetler
//   Drag sırasında store güncellenmediği için re-render tetiklenmez
//   → aux node pozisyonları React tarafından bozulmaz

import { useRef, useEffect, useCallback } from 'react'
import type Konva from 'konva'
import { useEditorStore } from '@/store/editor.store'
import { setResizeDragging } from '@/hooks/useSelectTool'
import type { ChartObject } from '@/store/types'

export interface DragMoveOptions {
  stageRef:     React.RefObject<Konva.Stage | null>
  onDragStart?: () => void
  onDragEnd?:   () => void
}

interface DragSnapshot {
  id:          string
  originNodeX: number
  originNodeY: number
  isAux:       boolean  // true → label node, store'a yazılmaz
}

const DRAG_THRESHOLD = 5

// Bir row ID'si için label node ID'lerini döndür
function getLabelNodeIds(rowId: string): string[] {
  return [`${rowId}-label-L`, `${rowId}-label-R`]
}

export function useDragMove({ stageRef, onDragStart, onDragEnd }: DragMoveOptions) {
  const isPointerDown  = useRef(false)
  const isDragging     = useRef(false)
  const pointerStart   = useRef({ x: 0, y: 0 })
  const snapshots      = useRef<DragSnapshot[]>([])
  const pendingIds     = useRef<string[]>([])
  const draggingIdsRef = useRef<string[]>([])

  const storeRef = useRef({
    updateObject:  useEditorStore.getState().updateObject,
    pushHistory:   useEditorStore.getState().pushHistory,
    selectObjects: useEditorStore.getState().selectObjects,
  })

  useEffect(() => {
    return useEditorStore.subscribe((state) => {
      storeRef.current.updateObject  = state.updateObject
      storeRef.current.pushHistory   = state.pushHistory
      storeRef.current.selectObjects = state.selectObjects
    })
  }, [])

  const moveListenerRef = useRef<(e: MouseEvent) => void>(() => {})
  const upListenerRef   = useRef<(e: MouseEvent) => void>(() => {})

  useEffect(() => {
    moveListenerRef.current = (e: MouseEvent) => {
      if (!isPointerDown.current) return
      const stage = stageRef.current
      if (!stage) return

      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y

      if (!isDragging.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return

        isDragging.current     = true
        draggingIdsRef.current = [...pendingIds.current]
        setResizeDragging(true)
        onDragStart?.()

        // Ana row snapshot'ları
        const mainSnaps: DragSnapshot[] = pendingIds.current.flatMap((id) => {
          const node = stage.findOne(`#${id}`) as Konva.Node | undefined
          if (!node) return []
          return [{ id, originNodeX: node.x(), originNodeY: node.y(), isAux: false }]
        })

        // Label aux node snapshot'ları — bulunamazsa atla (label olmayan row'lar)
        const auxSnaps: DragSnapshot[] = pendingIds.current.flatMap((id) =>
          getLabelNodeIds(id).flatMap((auxId) => {
            const node = stage.findOne(`#${auxId}`) as Konva.Node | undefined
            if (!node) return []
            return [{ id: auxId, originNodeX: node.x(), originNodeY: node.y(), isAux: true }]
          }),
        )

        snapshots.current = [...mainSnaps, ...auxSnaps]

        const container = stage.container()
        if (container) container.style.cursor = 'move'
      }

      const scale   = stage.scaleX()
      const dxWorld = dx / scale
      const dyWorld = dy / scale

      // Ana row + label node'larını birlikte taşı
      for (const snap of snapshots.current) {
        const node = stage.findOne(`#${snap.id}`) as Konva.Node | undefined
        if (!node) continue
        node.x(snap.originNodeX + dxWorld)
        node.y(snap.originNodeY + dyWorld)
      }

      stage.getLayers()[0]?.batchDraw()
    }

    upListenerRef.current = (e: MouseEvent) => {
      if (!isPointerDown.current) return
      isPointerDown.current  = false

      const wasDragging      = isDragging.current
      isDragging.current     = false
      draggingIdsRef.current = []
      setResizeDragging(false)

      const stage     = stageRef.current
      const container = stage?.container()
      if (container) container.style.cursor = 'default'

      if (wasDragging) {
        e.stopPropagation()

        const { updateObject, pushHistory, selectObjects } = storeRef.current

        // Sadece ana row'ları store'a yaz (isAux=false)
        // Label pozisyonları store'daki row'dan hesaplandığı için ayrıca yazılmaz
        for (const snap of snapshots.current) {
          if (snap.isAux) continue
          const node = stage?.findOne(`#${snap.id}`) as Konva.Node | undefined
          if (!node) continue
          updateObject(snap.id, { x: node.x(), y: node.y() } as Partial<ChartObject>)
        }

        selectObjects(pendingIds.current)
        pushHistory()
        onDragEnd?.()
      }

      snapshots.current  = []
      pendingIds.current = []

      window.removeEventListener('mousemove', moveListenerRef.current)
      window.removeEventListener('mouseup',   upListenerRef.current)
    }

    return () => {
      window.removeEventListener('mousemove', moveListenerRef.current)
      window.removeEventListener('mouseup',   upListenerRef.current)
    }
  }, [stageRef, onDragStart, onDragEnd])

  const startDrag = useCallback(
    (e: MouseEvent, objectIds: string[]) => {
      if (objectIds.length === 0) return

      isPointerDown.current  = true
      isDragging.current     = false
      pointerStart.current   = { x: e.clientX, y: e.clientY }
      pendingIds.current     = objectIds
      snapshots.current      = []

      window.addEventListener('mousemove', moveListenerRef.current)
      window.addEventListener('mouseup',   upListenerRef.current)
    },
    [],
  )

  return { startDrag, isDraggingRef: isDragging, draggingIdsRef }
}