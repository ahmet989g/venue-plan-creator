'use client'

// Global obje taşıma hook'u — Row, Table, Booth vb. tüm tipler kullanır
// Performans: drag sırasında store'a yazılmaz, Konva node'ları imperatif taşınır
// Store sync: sadece mouseUp'ta, tek seferlik yazılır
// Threshold: 5px altında hareket drag sayılmaz — tıklamada kayma olmaz

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
}

const DRAG_THRESHOLD = 5   // px — bu kadar hareket edilmeden drag başlamaz

export function useDragMove({ stageRef, onDragStart, onDragEnd }: DragMoveOptions) {
  const isPointerDown  = useRef(false)   // Mouse basılı mı
  const isDragging     = useRef(false)   // Threshold aşıldı mı
  const pointerStart   = useRef({ x: 0, y: 0 })
  const snapshots      = useRef<DragSnapshot[]>([])
  const pendingIds     = useRef<string[]>([])   // Drag başlayana kadar bekleyen id'ler

  const storeRef = useRef({
    updateObject:      useEditorStore.getState().updateObject,
    pushHistory:       useEditorStore.getState().pushHistory,
    selectObjects:     useEditorStore.getState().selectObjects,
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

      // Threshold kontrolü — ilk defa eşiği aşınca drag'i başlat
      if (!isDragging.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return

        isDragging.current = true
        setResizeDragging(true)
        onDragStart?.()

        // Snapshot'ları şimdi al — drag gerçekten başladı
        snapshots.current = pendingIds.current.flatMap((id) => {
          const node = stage.findOne(`#${id}`) as Konva.Node | undefined
          if (!node) return []
          return [{ id, originNodeX: node.x(), originNodeY: node.y() }]
        })

        const container = stage.container()
        if (container) container.style.cursor = 'move'
      }

      const scale   = stage.scaleX()
      const dxWorld = dx / scale
      const dyWorld = dy / scale

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
      isPointerDown.current = false

      const wasDragging = isDragging.current
      isDragging.current = false
      setResizeDragging(false)

      const stage     = stageRef.current
      const container = stage?.container()
      if (container) container.style.cursor = 'default'

      if (wasDragging) {
        e.stopPropagation()

        // Store'a yaz — drag bitişinde tek seferlik
        const { updateObject, pushHistory, selectObjects } = storeRef.current
        for (const snap of snapshots.current) {
          const node = stage?.findOne(`#${snap.id}`) as Konva.Node | undefined
          if (!node) continue
          updateObject(snap.id, { x: node.x(), y: node.y() } as Partial<ChartObject>)
        }

        // Tüm taşınan objeleri seçili tut
        selectObjects(pendingIds.current)
        pushHistory()
        onDragEnd?.()
      }

      snapshots.current = []
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
      isDragging.current     = false   // Threshold geçilmeden drag başlamaz
      pointerStart.current   = { x: e.clientX, y: e.clientY }
      pendingIds.current     = objectIds
      snapshots.current      = []

      window.addEventListener('mousemove', moveListenerRef.current)
      window.addEventListener('mouseup',   upListenerRef.current)
    },
    [],
  )

  return { startDrag, isDraggingRef: isDragging }
}