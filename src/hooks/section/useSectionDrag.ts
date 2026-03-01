'use client'

// Section drag hook — polygon ve rect section'ları taşır
//
// Polygon: tüm points dx/dy kadar ötelenir
// Rect:    x/y dx/dy kadar ötelenir
//
// Performans:
//   Drag sırasında store güncellenmez → React re-render yok
//   Konva node'ları imperatif taşınır (node.x/y())
//   mouseUp'ta tek seferde store'a yazılır + pushHistory

import { useRef, useEffect, useCallback } from 'react'
import type Konva from 'konva'
import { useEditorStore } from '@/store/editor.store'
import type { Row, Section } from '@/store/types'

const DRAG_THRESHOLD = 4  // px — bu altında drag başlamaz (click ile karışmaz)

export interface SectionDragResult {
  startSectionDrag:    (e: MouseEvent, sectionId: string) => void
  isDraggingRef:       React.RefObject<boolean>
  draggingSectionId:   React.RefObject<string | null>
}

export function useSectionDrag(
  stageRef: React.RefObject<Konva.Stage | null>,
): SectionDragResult {
  const isPointerDown      = useRef(false)
  const isDragging         = useRef(false)
  const draggingSectionId  = useRef<string | null>(null)
  const pointerStart       = useRef({ x: 0, y: 0 })
  const originPos          = useRef({ x: 0, y: 0 }) // Node'un drag başındaki pozisyonu

  // Store fn'leri — ref ile tutulur, subscribe ile güncellenir
  const storeRef = useRef({
    updateSection: useEditorStore.getState().updateSection,
    updateObject:  useEditorStore.getState().updateObject,
    pushHistory:   useEditorStore.getState().pushHistory,
    selectObjects: useEditorStore.getState().selectObjects,
  })

  useEffect(() => {
    return useEditorStore.subscribe((s) => {
      storeRef.current.updateSection = s.updateSection
      storeRef.current.updateObject  = s.updateObject
      storeRef.current.pushHistory   = s.pushHistory
      storeRef.current.selectObjects = s.selectObjects
    })
  }, [])

  const moveListenerRef = useRef<(e: MouseEvent) => void>(() => {})
  const upListenerRef   = useRef<(e: MouseEvent) => void>(() => {})

  useEffect(() => {
    moveListenerRef.current = (e: MouseEvent) => {
      if (!isPointerDown.current) return
      const stage = stageRef.current
      if (!stage || !draggingSectionId.current) return

      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y

      // Drag eşiği aşıldı mı?
      if (!isDragging.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
        isDragging.current = true
        const container = stage.container()
        if (container) container.style.cursor = 'move'
      }

      const scale   = stage.scaleX()
      const dxWorld = dx / scale
      const dyWorld = dy / scale

      // Konva node'unu imperatif taşı — React state tetiklenmez
      const node = stage.findOne(`#${draggingSectionId.current}`) as Konva.Node | undefined
      if (node) {
        node.x(originPos.current.x + dxWorld)
        node.y(originPos.current.y + dyWorld)
        stage.getLayers()[0]?.batchDraw()
      }
    }

    upListenerRef.current = (e: MouseEvent) => {
      if (!isPointerDown.current) return
      isPointerDown.current = false

      const wasDragging = isDragging.current
      isDragging.current = false

      const stage     = stageRef.current
      const container = stage?.container()
      if (container) container.style.cursor = 'default'

      if (wasDragging && draggingSectionId.current && stage) {
        e.stopPropagation()

        const sectionId = draggingSectionId.current
        const node = stage.findOne(`#${sectionId}`) as Konva.Node | undefined

        if (node) {
          const dxWorld = node.x() - originPos.current.x
          const dyWorld = node.y() - originPos.current.y

          // Store'dan güncel section'ı al — polygon/rect farkına göre güncelle
          const store = useEditorStore.getState()
          const floor = store.chart?.floors.find((f) => f.id === store.activeFloorId)
          const section = floor?.sections.find((s) => s.id === sectionId) as Section | undefined

          if (section) {
            if (section.shape === 'polygon') {
              storeRef.current.updateSection(sectionId, {
                points: (section.points ?? []).map((p) => ({
                  x: p.x + dxWorld,
                  y: p.y + dyWorld,
                })),
              })
            } else {
              storeRef.current.updateSection(sectionId, {
                x: (section.x ?? 0) + dxWorld,
                y: (section.y ?? 0) + dyWorld,
              })
            }

            // Section içindeki row'ları da aynı delta ile ötelе
            // Stripe'lar row koordinatlarına bağlı — güncellenmazsa eski konuma döner
            for (const objId of section.objectIds) {
              const obj = floor?.objects.find((o) => o.id === objId)
              if (!obj || obj.type !== 'row') continue
              const row = obj as Row
              storeRef.current.updateObject(objId, {
                x: row.x + dxWorld,
                y: row.y + dyWorld,
              })
            }

            // Node'u sıfırla — store değerleri zaten güncellendi
            node.x(0)
            node.y(0)

            storeRef.current.selectObjects([sectionId])
            storeRef.current.pushHistory()
          }
        }
      }

      draggingSectionId.current = null
      window.removeEventListener('mousemove', moveListenerRef.current)
      window.removeEventListener('mouseup',   upListenerRef.current)
    }

    return () => {
      window.removeEventListener('mousemove', moveListenerRef.current)
      window.removeEventListener('mouseup',   upListenerRef.current)
    }
  }, [stageRef])

  const startSectionDrag = useCallback(
    (e: MouseEvent, sectionId: string) => {
      const stage = stageRef.current
      if (!stage) return

      // Editing context aktifken drag engellenir
      const { editingContext } = useEditorStore.getState()
      if (editingContext?.type === 'section') return
      isPointerDown.current     = true
      isDragging.current        = false
      pointerStart.current      = { x: e.clientX, y: e.clientY }
      draggingSectionId.current = sectionId

      // Node'un mevcut pozisyonunu kaydet
      const node = stage.findOne(`#${sectionId}`) as Konva.Node | undefined
      originPos.current = { x: node?.x() ?? 0, y: node?.y() ?? 0 }

      window.addEventListener('mousemove', moveListenerRef.current)
      window.addEventListener('mouseup',   upListenerRef.current)
    },
    [stageRef],
  )

  return { startSectionDrag, isDraggingRef: isDragging, draggingSectionId }
}